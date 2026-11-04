const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const USERS_DB_PATH = process.env.USERS_DB_PATH || path.join(__dirname, 'users.json');

// --- 소셜 로그인 서버 검증 설정 (클라이언트가 보낸 이메일/이름은 신뢰하지 않고, 제공사 API로 직접 확인한다) ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '922694159566-8t2dun8coqv923h9qvg1fd3hir4hkana.apps.googleusercontent.com';
const GOOGLE_TOKENINFO_URL = process.env.GOOGLE_TOKENINFO_URL || 'https://oauth2.googleapis.com/tokeninfo';
const GOOGLE_USERINFO_URL = process.env.GOOGLE_USERINFO_URL || 'https://www.googleapis.com/oauth2/v3/userinfo';
const KAKAO_API_BASE = process.env.KAKAO_API_BASE || 'https://kapi.kakao.com';
const KAKAO_APP_ID = process.env.KAKAO_APP_ID || ''; // 카카오 개발자 콘솔 > 앱 설정 > 앱 ID (설정 시 다른 앱에서 발급된 토큰 거부)
const NAVER_API_BASE = process.env.NAVER_API_BASE || 'https://openapi.naver.com';
const SOCIAL_PLACEHOLDER_DOMAIN = 'social.marketingmap.kr'; // 제공사가 이메일을 주지 않을 때 쓰는 내부용 주소 (이메일 가입에서는 사용 금지)
const PROVIDER_LABELS = { kakao: '카카오톡(Kakao)', google: 'Google', naver: '네이버(NAVER)', email: '이메일' };

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

// --- Signed auth token (HMAC-SHA256). 비밀키는 환경변수 AUTH_SECRET 또는 .auth_secret 파일(서버 최초 실행 시 자동 생성) ---
const AUTH_SECRET_PATH = path.join(__dirname, '.auth_secret');
function loadAuthSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  try {
    return fs.readFileSync(AUTH_SECRET_PATH, 'utf8').trim();
  } catch (e) {
    const secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(AUTH_SECRET_PATH, secret, { mode: 0o600 });
    return secret;
  }
}
const AUTH_SECRET = loadAuthSecret();
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function signToken(user) {
  const payload = Buffer.from(JSON.stringify({ uid: user.id, email: user.email, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}

function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function getAuthUser(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  return verifyToken(token);
}

// --- Social credential verification ---
function authError(status, publicMessage) {
  const err = new Error(publicMessage);
  err.status = status;
  err.publicMessage = publicMessage;
  return err;
}

async function fetchProviderJson(url, headers = {}) {
  let resp;
  try {
    resp = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  } catch (e) {
    throw authError(503, '소셜 인증 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  if (!resp.ok) {
    throw authError(401, '소셜 인증 정보가 유효하지 않거나 만료되었습니다. 다시 로그인해 주세요.');
  }
  try {
    return await resp.json();
  } catch (e) {
    throw authError(502, '소셜 인증 응답을 해석하지 못했습니다.');
  }
}

function normalizeProvider(label) {
  const s = String(label || '').toLowerCase();
  if (s.includes('kakao') || s.includes('카카오')) return 'kakao';
  if (s.includes('google') || s.includes('구글')) return 'google';
  if (s.includes('naver') || s.includes('네이버')) return 'naver';
  return 'email';
}

// 반환: { providerKey, providerId, email, emailVerified, name }  (모두 제공사 응답에서 가져온 값)
async function verifySocialCredential(body) {
  const key = String(body.providerKey || '').toLowerCase();
  const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
  const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';

  if (key === 'kakao') {
    if (!accessToken) throw authError(401, '카카오 인증 정보가 없습니다. 다시 로그인해 주세요.');
    const auth = { Authorization: 'Bearer ' + accessToken };
    const me = await fetchProviderJson(KAKAO_API_BASE + '/v2/user/me', auth);
    if (!me || !me.id) throw authError(401, '카카오 계정 정보를 확인하지 못했습니다.');
    if (KAKAO_APP_ID) {
      const info = await fetchProviderJson(KAKAO_API_BASE + '/v1/user/access_token_info', auth);
      if (String(info.app_id) !== String(KAKAO_APP_ID)) {
        throw authError(401, '이 서비스에서 발급된 카카오 인증 정보가 아닙니다.');
      }
    }
    const acct = me.kakao_account || {};
    const hasVerifiedEmail = Boolean(acct.email && acct.is_email_valid && acct.is_email_verified);
    return {
      providerKey: 'kakao',
      providerId: String(me.id),
      email: String(acct.email || ('kakao_' + me.id + '@' + SOCIAL_PLACEHOLDER_DOMAIN)).toLowerCase(),
      emailVerified: hasVerifiedEmail,
      name: (acct.profile && acct.profile.nickname) || (me.properties && me.properties.nickname) || '카카오 회원'
    };
  }

  if (key === 'google') {
    if (!accessToken && !idToken) throw authError(401, 'Google 인증 정보가 없습니다. 다시 로그인해 주세요.');
    const query = idToken ? 'id_token=' + encodeURIComponent(idToken) : 'access_token=' + encodeURIComponent(accessToken);
    const info = await fetchProviderJson(GOOGLE_TOKENINFO_URL + '?' + query);
    if (info.aud !== GOOGLE_CLIENT_ID && info.azp !== GOOGLE_CLIENT_ID) {
      throw authError(401, '이 서비스에서 발급된 Google 인증 정보가 아닙니다.');
    }
    if (!info.sub) throw authError(401, 'Google 계정 정보를 확인하지 못했습니다.');
    if (!info.email) throw authError(401, 'Google 계정에서 이메일을 가져오지 못했습니다. 이메일 제공에 동의해 주세요.');
    let name = info.name || '';
    if (!name && accessToken) {
      try {
        const profile = await fetchProviderJson(GOOGLE_USERINFO_URL, { Authorization: 'Bearer ' + accessToken });
        name = profile.name || '';
      } catch (e) { /* 이름은 선택 정보 */ }
    }
    return {
      providerKey: 'google',
      providerId: String(info.sub),
      email: String(info.email).toLowerCase(),
      emailVerified: String(info.email_verified) === 'true',
      name: name || '구글 회원'
    };
  }

  if (key === 'naver') {
    if (!accessToken) throw authError(401, '네이버 인증 정보가 없습니다. 다시 로그인해 주세요.');
    const me = await fetchProviderJson(NAVER_API_BASE + '/v1/nid/me', { Authorization: 'Bearer ' + accessToken });
    const r = me && me.response;
    if (!me || me.resultcode !== '00' || !r || !r.id) throw authError(401, '네이버 계정 정보를 확인하지 못했습니다.');
    return {
      providerKey: 'naver',
      providerId: String(r.id),
      email: String(r.email || ('naver_' + r.id + '@' + SOCIAL_PLACEHOLDER_DOMAIN)).toLowerCase(),
      emailVerified: false, // 네이버 연락처 이메일은 소유 확인이 보장되지 않으므로 이메일만으로 기존 계정과 연결하지 않는다
      name: r.name || r.nickname || '네이버 회원'
    };
  }

  throw authError(400, '지원하지 않는 소셜 로그인 방식입니다.');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

function loadUsers() {
  try {
    if (!fs.existsSync(USERS_DB_PATH)) {
      const demoUser = {
        id: 'usr_demo_ceo',
        name: '오드리 대표',
        brand: '오드리고깃집',
        email: 'ceo@marketingmap.kr',
        passwordHash: hashPassword('123456'),
        marketingOptIn: true,
        provider: 'email',
        createdAt: '2026-10-28T00:00:00.000Z',
        lastLoginAt: '2026-10-28T00:00:00.000Z'
      };
      fs.writeFileSync(USERS_DB_PATH, JSON.stringify([demoUser], null, 2), 'utf-8');
      return [demoUser];
    }
    const raw = fs.readFileSync(USERS_DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read users.json:', err);
    return [];
  }
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write users.json:', err);
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(payload), 'utf-8');
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

if (!KAKAO_APP_ID) console.warn('[보안] KAKAO_APP_ID가 설정되지 않았습니다. 다른 카카오 앱에서 발급된 토큰도 허용됩니다. (환경변수 KAKAO_APP_ID 설정 권장)');

// Ensure initial users.json exists on startup
loadUsers();

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const reqPath = parsedUrl.pathname;

  // --- AUTHENTICATION API ENDPOINTS ---
  if (reqPath === '/api/auth/check-email' && req.method === 'GET') {
    const email = (parsedUrl.searchParams.get('email') || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return sendJson(res, 400, { ok: false, message: '올바른 이메일 주소를 입력해 주세요.' });
    }
    const users = loadUsers();
    const exists = users.some(u => u.email.toLowerCase() === email);
    return sendJson(res, 200, {
      ok: true,
      available: !exists,
      message: exists ? '이미 가입된 이메일 주소입니다.' : '사용 가능한 이메일 주소입니다.'
    });
  }

  if (reqPath === '/api/auth/register' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const name = (body.name || '').trim();
      const brand = (body.brand || '').trim();
      const email = (body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const marketingOptIn = Boolean(body.marketingOptIn);
      const termsAge = Boolean(body.termsAge);
      const termsService = Boolean(body.termsService);
      const termsPrivacy = Boolean(body.termsPrivacy);
        const phone = (body.phone || "").trim();
        const gender = (body.gender || "M").trim();
        const birth = (body.birth || "").trim();
        const vipCode = (body.vipCode || "").trim();
        const smsOptIn = Boolean(body.smsOptIn);
        const industry = (body.industry || '').trim();

      if (!name) {
        return sendJson(res, 400, { ok: false, message: '대표자 성함을 입력해 주세요.' });
      }
      if (!email || !email.includes('@')) {
        return sendJson(res, 400, { ok: false, message: '유효한 이메일 주소를 입력해 주세요.' });
      }
      if (email.endsWith('@' + SOCIAL_PLACEHOLDER_DOMAIN)) {
        return sendJson(res, 400, { ok: false, message: '사용할 수 없는 이메일 주소입니다.' });
      }
      if (password.length < 6) {
        return sendJson(res, 400, { ok: false, message: '비밀번호는 6자 이상 입력해 주세요.' });
      }
      if (!termsAge || !termsService || !termsPrivacy) {
        return sendJson(res, 400, { ok: false, message: '서비스 이용을 위해 필수 약관에 모두 동의해 주세요.' });
      }

      const users = loadUsers();
      const existing = users.find(u => u.email.toLowerCase() === email);
      if (existing) {
        return sendJson(res, 409, { ok: false, message: '이미 가입된 이메일 주소입니다. 로그인 탭에서 로그인해 주세요.' });
      }

      const now = new Date().toISOString();
      const newUser = {
        id: 'usr_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
        name,
        brand,
        email,
        passwordHash: hashPassword(password),
        marketingOptIn,
          phone,
          gender,
          birth,
          vipCode,
          smsOptIn,
          industry,
        termsAgreedAt: now,
        marketingConsentAt: (marketingOptIn || smsOptIn) ? now : null,
        provider: 'email',
        createdAt: now,
        lastLoginAt: now
      };

      users.push(newUser);
      saveUsers(users);

      const token = signToken(newUser);
      return sendJson(res, 201, {
        ok: true,
        message: `환영합니다, ${newUser.name}님! 회원가입이 완료되었습니다.`,
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          brand: newUser.brand,
          email: newUser.email,
          provider: newUser.provider,
          createdAt: newUser.createdAt
        }
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, message: '회원가입 요청 처리 중 오류가 발생했습니다.' });
    }
  }

  if (reqPath === '/api/auth/login' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const email = (body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (!email || !password) {
        return sendJson(res, 400, { ok: false, message: '이메일과 비밀번호를 모두 입력해 주세요.' });
      }

      const users = loadUsers();
      const user = users.find(u => u.email.toLowerCase() === email);
      if (!user) {
        return sendJson(res, 401, { ok: false, message: '가입되지 않은 이메일입니다. 먼저 무료 회원가입을 진행해 주세요.' });
      }

      if (!verifyPassword(password, user.passwordHash)) {
        return sendJson(res, 401, { ok: false, message: '비밀번호가 일치하지 않습니다. 다시 확인해 주세요.' });
      }

      user.lastLoginAt = new Date().toISOString();
      saveUsers(users);

      const token = signToken(user);
      return sendJson(res, 200, {
        ok: true,
        message: `${user.name}님, 환영합니다!`,
        token,
        user: {
          id: user.id,
          name: user.name,
          brand: user.brand || '',
          email: user.email,
          marketingOptIn: Boolean(user.marketingOptIn),
          provider: user.provider || 'email',
          createdAt: user.createdAt
        }
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, message: '로그인 처리 중 오류가 발생했습니다.' });
    }
  }

  if (reqPath === '/api/auth/social' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const termsAgreed = Boolean(body.termsAgreed);
      const marketingOptIn = Boolean(body.marketingOptIn);

      // 이메일/이름은 클라이언트 입력이 아니라 제공사 API 응답으로만 결정한다
      let identity;
      try {
        identity = await verifySocialCredential(body);
      } catch (verifyErr) {
        return sendJson(res, verifyErr.status || 401, { ok: false, message: verifyErr.publicMessage || '소셜 인증 정보를 확인하지 못했습니다.' });
      }

      const users = loadUsers();
      const now = new Date().toISOString();
      let user = users.find(u => u.providerKey === identity.providerKey && u.providerId === identity.providerId);

      // 이전 버전에서 가입한 소셜 회원(providerId 없음)은, 제공사가 이메일 소유를 확인해 준 경우에만 연결한다
      if (!user && identity.emailVerified) {
        user = users.find(u => !u.providerId && u.email.toLowerCase() === identity.email && normalizeProvider(u.provider) === identity.providerKey);
        if (user) {
          user.providerKey = identity.providerKey;
          user.providerId = identity.providerId;
        }
      }

      if (!user) {
        // 같은 이메일로 이미 다른 방식(이메일 가입 등)으로 만든 계정이 있으면 자동 연결하지 않는다 (계정 선점 공격 방지)
        const sameEmail = users.find(u => u.email.toLowerCase() === identity.email);
        if (sameEmail) {
          const existingLabel = PROVIDER_LABELS[normalizeProvider(sameEmail.provider)] || sameEmail.provider;
          return sendJson(res, 409, { ok: false, message: '이 이메일은 이미 ' + existingLabel + ' 방식으로 가입되어 있습니다. 기존 방식으로 로그인해 주세요.' });
        }
        if (!termsAgreed) {
          return sendJson(res, 400, { ok: false, needsConsent: true, message: '서비스 이용약관과 개인정보 수집·이용에 동의해 주세요.' });
        }
        user = {
          id: 'usr_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
          name: identity.name,
          brand: '',
          email: identity.email,
          passwordHash: hashPassword(crypto.randomBytes(12).toString('hex')),
          marketingOptIn: marketingOptIn,
          termsAgreedAt: now,
          marketingConsentAt: marketingOptIn ? now : null,
          provider: PROVIDER_LABELS[identity.providerKey],
          providerKey: identity.providerKey,
          providerId: identity.providerId,
          createdAt: now,
          lastLoginAt: now
        };
        users.push(user);
      } else {
        user.lastLoginAt = now;
        if (!user.name && identity.name) user.name = identity.name;
      }
      saveUsers(users);

      const token = signToken(user);
      return sendJson(res, 200, {
        ok: true,
        message: `${user.name}님, ${user.provider} 계정으로 시작합니다!`,
        token,
        user: {
          id: user.id,
          name: user.name,
          brand: user.brand || '',
          email: user.email,
          marketingOptIn: Boolean(user.marketingOptIn),
          provider: user.provider,
          createdAt: user.createdAt
        }
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, message: '소셜 인증 처리 중 오류가 발생했습니다.' });
    }
  }

  // Update marketing opt-in
  if (reqPath === '/api/auth/profile/marketing' && req.method === 'POST') {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) {
        return sendJson(res, 401, { ok: false, message: '로그인이 필요합니다. 다시 로그인해 주세요.' });
      }
      const body = await parseRequestBody(req);
      const requestedEmail = (body.email || '').trim().toLowerCase();
      if (requestedEmail && requestedEmail !== String(authUser.email).toLowerCase()) {
        return sendJson(res, 403, { ok: false, message: '본인 계정의 수신 설정만 변경할 수 있습니다.' });
      }
      const marketingOptIn = Boolean(body.marketingOptIn);

      const users = loadUsers();
      const user = users.find(u => u.email.toLowerCase() === String(authUser.email).toLowerCase());
      if (user) {
        user.marketingOptIn = marketingOptIn;
        user.marketingConsentAt = marketingOptIn ? new Date().toISOString() : null;
        saveUsers(users);
        return sendJson(res, 200, { ok: true, message: '마케팅 수신 상태가 성공적으로 변경되었습니다.' });
      }
      return sendJson(res, 404, { ok: false, message: '사용자를 찾을 수 없습니다.' });
    } catch (err) {
      return sendJson(res, 500, { ok: false, message: '서버 오류' });
    }
  }

  // --- STATIC FILE SERVING ---
  const relativePath = reqPath === '/' ? 'index.html' : reqPath.replace(/^\/+/, '');
  // Prevent access to users.json directly via static serving
  if (relativePath.toLowerCase() === 'users.json' || relativePath.split('/').some((seg) => seg.startsWith('.'))) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden');
  }

  let filePath = path.join(__dirname, relativePath);
  const extname = path.extname(filePath);
  let contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`MarketingMap Server running at http://localhost:${PORT}/`);
});
