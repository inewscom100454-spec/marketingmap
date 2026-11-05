const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- .env 로더 (외부 패키지 없음): KEY=VALUE 형식. 이미 설정된 환경변수는 덮어쓰지 않는다. (.env 는 웹으로 제공되지 않음) ---
(function loadEnvFile() {
  try {
    const envPath = process.env.ENV_FILE || path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m || line.trim().startsWith('#')) return;
      const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
      if (process.env[m[1]] === undefined) process.env[m[1]] = value;
    });
  } catch (e) {
    console.warn('[경고] .env 파일을 읽지 못했습니다:', e.message);
  }
})();

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
  const payload = Buffer.from(JSON.stringify({ uid: user.id, email: user.email, tv: user.tokenVersion || 0, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
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

// 토큰이 유효하고, 해당 회원이 아직 존재하며, 비밀번호 변경 등으로 무효화되지 않았을 때만 회원을 돌려준다
function authenticateUser(req, users) {
  const payload = getAuthUser(req);
  if (!payload) return null;
  const user = users.find(u => u.id === payload.uid && u.email.toLowerCase() === String(payload.email).toLowerCase());
  if (!user) return null;
  if ((payload.tv || 0) !== (user.tokenVersion || 0)) return null;
  return user;
}

function publicUser(user) {
  const isEmailAccount = normalizeProvider(user.provider) === 'email';
  return {
    id: user.id,
    name: user.name,
    brand: user.brand || '',
    email: user.email,
    marketingOptIn: Boolean(user.marketingOptIn),
    provider: user.provider || 'email',
    createdAt: user.createdAt,
    emailVerified: isEmailAccount ? user.emailVerified === true : true
  };
}

// --- 이메일 발송 (Brevo 무료 요금제: 하루 300통) ---
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_API_URL = process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email';
const MAIL_FROM_EMAIL = process.env.MAIL_FROM_EMAIL || '';
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'MarketingMap';
// 메일 속 링크는 반드시 설정된 주소로 만든다 (요청의 Host 헤더를 쓰면 비밀번호 재설정 링크 조작이 가능해짐)
const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
const MAIL_DAILY_LIMIT = Number(process.env.MAIL_DAILY_LIMIT) || 250; // 무료 한도(300)보다 낮게
const MAIL_ENABLED = Boolean(BREVO_API_KEY && MAIL_FROM_EMAIL && PUBLIC_BASE_URL);
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
let mailDay = '';
let mailCount = 0;

function linkBase() {
  return PUBLIC_BASE_URL || `http://localhost:${PORT}`;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

// 일회용 토큰: 메일에는 원본을, DB에는 해시만 저장한다
function newOneTimeToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: sha256Hex(token) };
}

function escapeHtmlServer(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function mailLayout(title, bodyHtml, ctaLabel, ctaLink) {
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f4f4f5;font-family:-apple-system,'Malgun Gothic',sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:28px 16px;">
<div style="background:#ffffff;border-radius:14px;padding:32px 28px;border:1px solid #e5e7eb;">
<div style="font-size:13px;font-weight:800;color:#ff6b00;letter-spacing:.4px;margin-bottom:18px;">MarketingMap</div>
<h1 style="font-size:20px;color:#111;margin:0 0 14px;">${escapeHtmlServer(title)}</h1>
<div style="font-size:14px;line-height:1.7;color:#374151;">${bodyHtml}</div>
<div style="margin:26px 0;"><a href="${escapeHtmlServer(ctaLink)}" style="display:inline-block;background:#ff6b00;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:10px;">${escapeHtmlServer(ctaLabel)}</a></div>
<div style="font-size:12px;color:#6b7280;line-height:1.6;">버튼이 열리지 않으면 아래 주소를 브라우저에 붙여 넣어 주세요.<br><span style="word-break:break-all;color:#374151;">${escapeHtmlServer(ctaLink)}</span></div>
</div>
<div style="font-size:11px;color:#9ca3af;text-align:center;margin-top:16px;line-height:1.6;">본 메일은 MarketingMap 서비스 이용과 관련하여 발송된 안내 메일입니다.<br>본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</div>
</div></body></html>`;
}

function buildVerificationMail(user, link) {
  const subject = '[MarketingMap] 이메일 인증을 완료해 주세요';
  const html = mailLayout(
    '이메일 인증',
    `<strong>${escapeHtmlServer(user.name)}</strong>님, MarketingMap에 가입해 주셔서 감사합니다.<br>아래 버튼을 눌러 이메일 주소 인증을 완료해 주세요. 링크는 24시간 동안 유효합니다.`,
    '이메일 인증하기',
    link
  );
  const text = `${user.name}님, MarketingMap에 가입해 주셔서 감사합니다.\n아래 주소를 열어 이메일 인증을 완료해 주세요. (24시간 유효)\n\n${link}\n\n본인이 요청하지 않았다면 이 메일을 무시해 주세요.`;
  return { subject, html, text };
}

function buildResetMail(user, link) {
  const subject = '[MarketingMap] 비밀번호 재설정 안내';
  const html = mailLayout(
    '비밀번호 재설정',
    `<strong>${escapeHtmlServer(user.name)}</strong>님, 비밀번호 재설정을 요청하셨습니다.<br>아래 버튼을 눌러 새 비밀번호를 설정해 주세요. 링크는 30분 동안만 유효하며 한 번만 사용할 수 있습니다.`,
    '비밀번호 재설정하기',
    link
  );
  const text = `${user.name}님, 비밀번호 재설정을 요청하셨습니다.\n아래 주소를 열어 새 비밀번호를 설정해 주세요. (30분 유효, 1회용)\n\n${link}\n\n본인이 요청하지 않았다면 이 메일을 무시해 주세요. 비밀번호는 변경되지 않습니다.`;
  return { subject, html, text };
}

function buildPasswordChangedMail(user) {
  const subject = '[MarketingMap] 비밀번호가 변경되었습니다';
  const html = mailLayout(
    '비밀번호 변경 안내',
    `<strong>${escapeHtmlServer(user.name)}</strong>님의 계정 비밀번호가 방금 변경되었습니다.<br>본인이 변경하지 않았다면 즉시 비밀번호 재설정을 다시 진행해 주세요.`,
    'MarketingMap 열기',
    linkBase() + '/'
  );
  const text = `${user.name}님의 계정 비밀번호가 방금 변경되었습니다.\n본인이 변경하지 않았다면 즉시 비밀번호 재설정을 다시 진행해 주세요.\n${linkBase()}/`;
  return { subject, html, text };
}

// 반환: { ok, mode?, reason? } - 실패해도 예외를 던지지 않는다 (메일 장애가 가입/로그인을 막지 않도록)
async function sendMail({ to, subject, html, text }) {
  if (!MAIL_ENABLED) {
    console.log(`[메일(콘솔 모드)] 수신: ${to} | 제목: ${subject}\n${text}\n`);
    return { ok: true, mode: 'console' };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (mailDay !== today) { mailDay = today; mailCount = 0; }
  if (mailCount >= MAIL_DAILY_LIMIT) {
    console.warn('[메일] 일일 발송 한도에 도달해 발송하지 않았습니다.');
    return { ok: false, reason: 'daily_limit' };
  }
  mailCount++;
  try {
    const resp = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ sender: { name: MAIL_FROM_NAME, email: MAIL_FROM_EMAIL }, to: [{ email: to }], subject, htmlContent: html, textContent: text }),
      signal: AbortSignal.timeout(10000)
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(`[메일] 발송 실패 (${resp.status}): ${detail.slice(0, 200)}`);
      return { ok: false, reason: 'provider_error' };
    }
    return { ok: true, mode: 'brevo' };
  } catch (e) {
    console.error('[메일] 발송 오류:', e.message + (e.cause ? ' (' + (e.cause.code || e.cause.message || e.cause) + ')' : ''));
    return { ok: false, reason: 'network' };
  }
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

const USERS_BAK_PATH = USERS_DB_PATH + '.bak';

// 임시 파일에 쓴 뒤 교체(rename)하여, 쓰는 도중 중단되어도 기존 파일이 깨지지 않게 한다
function writeFileAtomic(filePath, data) {
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, data, { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tmpPath, filePath);
}

function readUsersFile(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!Array.isArray(parsed)) throw new Error('회원 파일 형식이 올바르지 않습니다(배열이 아님)');
  return parsed;
}

function restoreUsersFromBackup(reason) {
  if (!fs.existsSync(USERS_BAK_PATH)) return null;
  try {
    const users = readUsersFile(USERS_BAK_PATH);
    writeFileAtomic(USERS_DB_PATH, JSON.stringify(users, null, 2));
    console.warn('[복구] ' + reason + ' → 백업(' + path.basename(USERS_BAK_PATH) + ')에서 회원 ' + users.length + '명을 복구했습니다.');
    return users;
  } catch (e) {
    console.error('[치명] 백업 파일도 읽을 수 없습니다:', e.message);
    return null;
  }
}

// 손상된 파일을 빈 목록으로 간주해 덮어쓰지 않는다: 백업 복구에 실패하면 예외를 던져 서버가 멈추게 한다
function loadUsers() {
  if (!fs.existsSync(USERS_DB_PATH)) {
    const restored = restoreUsersFromBackup('회원 파일이 없음');
    if (restored) return restored;
    writeFileAtomic(USERS_DB_PATH, '[]');
    return [];
  }
  try {
    return readUsersFile(USERS_DB_PATH);
  } catch (err) {
    console.error('[치명] 회원 파일을 읽을 수 없습니다:', err.message);
    const corruptCopy = USERS_DB_PATH.replace(/\.json$/, '') + '.corrupt-' + Date.now() + '.json';
    try {
      fs.copyFileSync(USERS_DB_PATH, corruptCopy);
      console.error('[보존] 손상된 파일을 ' + path.basename(corruptCopy) + ' 로 보관했습니다.');
    } catch (copyErr) { /* 보관 실패는 무시 */ }
    const restored = restoreUsersFromBackup('회원 파일 손상');
    if (restored) return restored;
    const fatal = new Error('USERS_DB_UNREADABLE');
    fatal.code = 'USERS_DB_UNREADABLE';
    throw fatal;
  }
}

// 저장 실패 시 예외를 던진다 (실패했는데 성공으로 응답하는 일이 없도록)
function saveUsers(users) {
  if (!Array.isArray(users)) throw new Error('saveUsers: 배열이 아닙니다');
  if (fs.existsSync(USERS_DB_PATH)) {
    try {
      fs.copyFileSync(USERS_DB_PATH, USERS_BAK_PATH);
    } catch (e) {
      console.error('[경고] 회원 파일 백업 실패:', e.message);
    }
  }
  writeFileAtomic(USERS_DB_PATH, JSON.stringify(users, null, 2));
}

// --- 보안 헬퍼: 클라이언트 IP, 요청 제한(rate limit), CORS, 보안 헤더 ---
const RATE_SCALE = Number(process.env.RATE_LIMIT_SCALE) || 1; // 테스트용 배율
const rateBuckets = new Map();
const failureBuckets = new Map();

function pruneBucket(list, windowMs, now) {
  while (list.length && list[0] <= now - windowMs) list.shift();
  return list;
}

function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const list = pruneBucket(rateBuckets.get(key) || [], windowMs, now);
  if (list.length >= limit * RATE_SCALE) {
    rateBuckets.set(key, list);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((list[0] + windowMs - now) / 1000)) };
  }
  list.push(now);
  rateBuckets.set(key, list);
  return { ok: true, retryAfter: 0 };
}

function failureCount(key, windowMs) {
  const list = pruneBucket(failureBuckets.get(key) || [], windowMs, Date.now());
  failureBuckets.set(key, list);
  return list.length;
}
function recordFailure(key) {
  const list = failureBuckets.get(key) || [];
  list.push(Date.now());
  failureBuckets.set(key, list);
}
function clearFailures(key) {
  failureBuckets.delete(key);
}

setInterval(() => {
  const now = Date.now();
  for (const [k, list] of rateBuckets) { pruneBucket(list, 3600 * 1000, now); if (!list.length) rateBuckets.delete(k); }
  for (const [k, list] of failureBuckets) { pruneBucket(list, 3600 * 1000, now); if (!list.length) failureBuckets.delete(k); }
}, 10 * 60 * 1000).unref();

// 프록시(Cloudflare 터널 등) 뒤에서는 로컬호스트로 접속하므로, 로컬 연결일 때만 전달 헤더의 실제 IP를 사용한다
function clientIp(req) {
  const remote = (req.socket && req.socket.remoteAddress) || '';
  const isLoopback = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
  if (isLoopback) {
    const forwarded = req.headers['cf-connecting-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (forwarded) return String(forwarded);
  }
  return remote || 'unknown';
}

const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
function allowedCorsOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  try {
    if (new URL(origin).host === req.headers.host) return origin; // 같은 출처
  } catch (e) { /* 잘못된 Origin */ }
  return '';
}

function applySecurityHeaders(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (String(req.url || '').startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  const corsOrigin = allowedCorsOrigin(req);
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Vary', 'Origin');
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload), 'utf-8');
}

const MAX_BODY_BYTES = 100 * 1024;
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf-8');
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

if (!MAIL_ENABLED) console.warn('[메일] BREVO_API_KEY / MAIL_FROM_EMAIL / PUBLIC_BASE_URL 중 설정되지 않은 값이 있어 이메일을 실제로 보내지 않고 콘솔에만 출력합니다. (이메일 인증·비밀번호 재설정 메일 사용 시 .env 설정 필요)');
if (!KAKAO_APP_ID) console.warn('[보안] KAKAO_APP_ID가 설정되지 않았습니다. 다른 카카오 앱에서 발급된 토큰도 허용됩니다. (환경변수 KAKAO_APP_ID 설정 권장)');

// 시작 시 회원 DB 검사: 손상되었고 복구도 불가능하면 빈 목록으로 덮어쓰지 않고 서버를 중단한다
try {
  loadUsers();
} catch (e) {
  console.error('\n[치명] 회원 데이터를 불러올 수 없어 서버를 시작하지 않습니다.');
  console.error('       손상된 users 파일과 .bak 백업을 확인해 주세요. (손상 파일은 users.corrupt-*.json 으로 보관됨)\n');
  process.exit(1);
}

process.on('unhandledRejection', (reason) => {
  console.error('[오류] 처리되지 않은 비동기 오류:', reason);
});

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '600'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const reqPath = parsedUrl.pathname;
  const ip = clientIp(req);
  const limited = (key, limit, windowMs) => {
    const r = rateLimit(key, limit, windowMs);
    if (r.ok) return false;
    res.setHeader('Retry-After', String(r.retryAfter));
    sendJson(res, 429, { ok: false, message: `요청이 너무 많습니다. ${r.retryAfter}초 후 다시 시도해 주세요.` });
    return true;
  };
  if (reqPath === '/api/auth/check-email' && req.method === 'GET' && limited('chk:' + ip, 30, 60 * 1000)) return;
  if (reqPath === '/api/auth/register' && req.method === 'POST' && limited('reg:' + ip, 10, 60 * 60 * 1000)) return;
  if (reqPath === '/api/auth/login' && req.method === 'POST' && limited('login:' + ip, 40, 15 * 60 * 1000)) return;
  if (reqPath === '/api/auth/social' && req.method === 'POST' && limited('soc:' + ip, 30, 10 * 60 * 1000)) return;
  if (reqPath === '/api/auth/account/delete' && req.method === 'POST' && limited('del:' + ip, 10, 15 * 60 * 1000)) return;
  if (reqPath === '/api/auth/profile/marketing' && req.method === 'POST' && limited('mkt:' + ip, 30, 10 * 60 * 1000)) return;
  if (reqPath === '/api/auth/verify-email' && req.method === 'GET' && limited('ver:' + ip, 30, 10 * 60 * 1000)) return;
  if (reqPath === '/api/auth/resend-verification' && req.method === 'POST' && limited('rsv:' + ip, 10, 60 * 60 * 1000)) return;
  if (reqPath === '/api/auth/password-reset/request' && req.method === 'POST' && limited('rstr:' + ip, 10, 60 * 60 * 1000)) return;
  if (reqPath === '/api/auth/password-reset/confirm' && req.method === 'POST' && limited('rstc:' + ip, 20, 60 * 60 * 1000)) return;
  if (reqPath === '/api/auth/me' && req.method === 'GET' && limited('me:' + ip, 60, 10 * 60 * 1000)) return;

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

      const verification = newOneTimeToken();
      newUser.emailVerified = false;
      newUser.emailVerifyHash = verification.hash;
      newUser.emailVerifyExpiresAt = Date.now() + VERIFY_TOKEN_TTL_MS;

      users.push(newUser);
      saveUsers(users);

      const verifyLink = `${linkBase()}/api/auth/verify-email?token=${encodeURIComponent(verification.token)}`;
      const sentResult = await sendMail({ to: newUser.email, ...buildVerificationMail(newUser, verifyLink) });

      const token = signToken(newUser);
      return sendJson(res, 201, {
        verificationSent: sentResult.ok,
        ok: true,
        message: `환영합니다, ${newUser.name}님! 회원가입이 완료되었습니다.`,
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          brand: newUser.brand,
          email: newUser.email,
          provider: newUser.provider,
          createdAt: newUser.createdAt,
          emailVerified: false
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

      const failKey = 'login:' + ip + '|' + email;
      if (failureCount(failKey, 15 * 60 * 1000) >= 8 * RATE_SCALE) {
        res.setHeader('Retry-After', '900');
        return sendJson(res, 429, { ok: false, message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.' });
      }

      const users = loadUsers();
      const user = users.find(u => u.email.toLowerCase() === email);
      if (!user) {
        recordFailure(failKey);
        return sendJson(res, 401, { ok: false, message: '가입되지 않은 이메일입니다. 먼저 무료 회원가입을 진행해 주세요.' });
      }

      if (!verifyPassword(password, user.passwordHash)) {
        recordFailure(failKey);
        return sendJson(res, 401, { ok: false, message: '비밀번호가 일치하지 않습니다. 다시 확인해 주세요.' });
      }

      clearFailures(failKey);
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
          emailVerified: normalizeProvider(user.provider) === 'email' ? user.emailVerified === true : true,
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
          emailVerified: identity.emailVerified,
          createdAt: now,
          lastLoginAt: now
        };
        users.push(user);
      } else {
        user.lastLoginAt = now;
        if (!user.name && identity.name) user.name = identity.name;
        if (termsAgreed) {
          user.termsAgreedAt = now;
          user.marketingOptIn = marketingOptIn;
          user.marketingConsentAt = marketingOptIn ? now : null;
        }
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
          emailVerified: normalizeProvider(user.provider) === 'email' ? user.emailVerified === true : true,
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
      const body = await parseRequestBody(req);
      const users = loadUsers();
      const user = authenticateUser(req, users);
      if (!user) {
        return sendJson(res, 401, { ok: false, message: '로그인이 필요합니다. 다시 로그인해 주세요.' });
      }
      const requestedEmail = (body.email || '').trim().toLowerCase();
      if (requestedEmail && requestedEmail !== user.email.toLowerCase()) {
        return sendJson(res, 403, { ok: false, message: '본인 계정의 수신 설정만 변경할 수 있습니다.' });
      }
      const marketingOptIn = Boolean(body.marketingOptIn);
      user.marketingOptIn = marketingOptIn;
      user.marketingConsentAt = marketingOptIn ? new Date().toISOString() : null;
      saveUsers(users);
      return sendJson(res, 200, { ok: true, message: '마케팅 수신 상태가 성공적으로 변경되었습니다.' });
    } catch (err) {
      return sendJson(res, 500, { ok: false, message: '서버 오류' });
    }
  }

  // 내 정보 조회 (로그인 상태 확인 + 최신 인증/수신 상태 동기화)
  if (reqPath === '/api/auth/me' && req.method === 'GET') {
    try {
      const users = loadUsers();
      const user = authenticateUser(req, users);
      if (!user) {
        return sendJson(res, 401, { ok: false, message: '로그인이 필요합니다.' });
      }
      return sendJson(res, 200, { ok: true, user: publicUser(user) });
    } catch (err) {
      return sendJson(res, 500, { ok: false, message: '서버 오류' });
    }
  }

  // 이메일 인증 링크 (메일 속 링크 클릭): 성공/실패와 관계없이 메인 화면으로 이동시키며 결과를 쿼리로 전달
  if (reqPath === '/api/auth/verify-email' && req.method === 'GET') {
    let verified = false;
    try {
      const token = parsedUrl.searchParams.get('token') || '';
      if (token) {
        const hash = sha256Hex(token);
        const users = loadUsers();
        const user = users.find(u => u.emailVerifyHash && u.emailVerifyHash === hash);
        if (user && (user.emailVerifyExpiresAt || 0) > Date.now()) {
          user.emailVerified = true;
          delete user.emailVerifyHash;
          delete user.emailVerifyExpiresAt;
          saveUsers(users);
          verified = true;
        }
      }
    } catch (err) {
      console.error('[이메일 인증] 처리 오류:', err.message);
    }
    res.writeHead(302, { Location: '/?emailVerified=' + (verified ? '1' : '0') });
    return res.end();
  }

  // 인증 메일 다시 보내기 (로그인 필요)
  if (reqPath === '/api/auth/resend-verification' && req.method === 'POST') {
    try {
      const users = loadUsers();
      const user = authenticateUser(req, users);
      if (!user) {
        return sendJson(res, 401, { ok: false, message: '로그인이 필요합니다. 다시 로그인해 주세요.' });
      }
      if (normalizeProvider(user.provider) !== 'email') {
        return sendJson(res, 400, { ok: false, message: '이메일로 가입한 회원만 이메일 인증이 필요합니다.' });
      }
      if (user.emailVerified === true) {
        return sendJson(res, 200, { ok: true, alreadyVerified: true, message: '이미 인증이 완료된 이메일입니다.' });
      }
      if (!rateLimit('rsvu:' + user.id, 3, 60 * 60 * 1000).ok) {
        return sendJson(res, 429, { ok: false, message: '인증 메일은 1시간에 3번까지 보낼 수 있습니다. 잠시 후 다시 시도해 주세요.' });
      }
      const verification = newOneTimeToken();
      user.emailVerifyHash = verification.hash;
      user.emailVerifyExpiresAt = Date.now() + VERIFY_TOKEN_TTL_MS;
      saveUsers(users);
      const link = `${linkBase()}/api/auth/verify-email?token=${encodeURIComponent(verification.token)}`;
      const result = await sendMail({ to: user.email, ...buildVerificationMail(user, link) });
      if (!result.ok) {
        return sendJson(res, 503, { ok: false, message: '인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.' });
      }
      return sendJson(res, 200, { ok: true, message: '인증 메일을 보냈습니다. 메일함(스팸함 포함)을 확인해 주세요.' });
    } catch (err) {
      return sendJson(res, 500, { ok: false, message: '인증 메일 처리 중 오류가 발생했습니다.' });
    }
  }

  // 비밀번호 재설정 요청: 가입 여부와 관계없이 항상 같은 응답을 주어 이메일 가입 여부를 알아낼 수 없게 한다
  if (reqPath === '/api/auth/password-reset/request' && req.method === 'POST') {
    const genericReply = { ok: true, message: '가입된 이메일이라면 비밀번호 재설정 안내 메일을 보냈습니다. 메일함(스팸함 포함)을 확인해 주세요. 링크는 30분 동안 유효합니다.' };
    try {
      const body = await parseRequestBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      if (email && email.includes('@') && email.length <= 254) {
        const users = loadUsers();
        const user = users.find(u => u.email.toLowerCase() === email);
        if (user && normalizeProvider(user.provider) === 'email' && rateLimit('rstu:' + user.id, 3, 60 * 60 * 1000).ok) {
          const reset = newOneTimeToken();
          user.resetHash = reset.hash;
          user.resetExpiresAt = Date.now() + RESET_TOKEN_TTL_MS;
          saveUsers(users);
          const link = `${linkBase()}/?reset=${encodeURIComponent(reset.token)}`;
          // 응답 시간으로 가입 여부를 추측하지 못하도록 메일 발송을 기다리지 않는다
          sendMail({ to: user.email, ...buildResetMail(user, link) }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[비밀번호 재설정] 요청 처리 오류:', err.message);
    }
    return sendJson(res, 200, genericReply);
  }

  // 비밀번호 재설정 확정: 일회용 토큰 + 새 비밀번호
  if (reqPath === '/api/auth/password-reset/confirm' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const token = String(body.token || '');
      const password = String(body.password || '');
      if (password.length < 6) {
        return sendJson(res, 400, { ok: false, message: '비밀번호는 6자 이상 입력해 주세요.' });
      }
      const users = loadUsers();
      const hash = token ? sha256Hex(token) : '';
      const user = hash ? users.find(u => u.resetHash && u.resetHash === hash) : null;
      if (!user || (user.resetExpiresAt || 0) < Date.now()) {
        return sendJson(res, 400, { ok: false, message: '재설정 링크가 만료되었거나 올바르지 않습니다. 비밀번호 찾기를 다시 진행해 주세요.' });
      }
      user.passwordHash = hashPassword(password);
      delete user.resetHash;
      delete user.resetExpiresAt;
      user.tokenVersion = (user.tokenVersion || 0) + 1; // 기존에 로그인되어 있던 모든 기기의 로그인 무효화
      user.emailVerified = true; // 메일의 링크를 열었으므로 이메일 소유가 확인됨
      saveUsers(users);
      for (const key of Array.from(failureBuckets.keys())) {
        if (key.endsWith('|' + user.email.toLowerCase())) failureBuckets.delete(key); // 로그인 잠금 해제
      }
      sendMail({ to: user.email, ...buildPasswordChangedMail(user) }).catch(() => {});
      return sendJson(res, 200, { ok: true, message: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.' });
    } catch (err) {
      return sendJson(res, 500, { ok: false, message: '비밀번호 재설정 처리 중 오류가 발생했습니다.' });
    }
  }

  // 회원 탈퇴: 로그인 토큰 필수, 이메일 가입 회원은 비밀번호 재확인. 계정 정보는 즉시 삭제된다.
  if (reqPath === '/api/auth/account/delete' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const users = loadUsers();
      const user = authenticateUser(req, users);
      if (!user) {
        return sendJson(res, 401, { ok: false, message: '로그인이 필요합니다. 다시 로그인해 주세요.' });
      }
      if (normalizeProvider(user.provider) === 'email') {
        const failKey = 'del:' + ip + '|' + user.email.toLowerCase();
        if (failureCount(failKey, 15 * 60 * 1000) >= 5 * RATE_SCALE) {
          return sendJson(res, 429, { ok: false, message: '비밀번호 확인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' });
        }
        if (!verifyPassword(String(body.password || ''), user.passwordHash)) {
          recordFailure(failKey);
          return sendJson(res, 401, { ok: false, message: '비밀번호가 일치하지 않습니다.' });
        }
        clearFailures(failKey);
      }
      users.splice(users.indexOf(user), 1);
      saveUsers(users);
      return sendJson(res, 200, { ok: true, message: '회원 탈퇴가 완료되었습니다. 계정과 개인정보가 삭제되었습니다.' });
    } catch (err) {
      return sendJson(res, 500, { ok: false, message: '회원 탈퇴 처리 중 오류가 발생했습니다.' });
    }
  }

  // --- STATIC FILE SERVING ---
  const relativePath = reqPath === '/' ? 'index.html' : reqPath.replace(/^\/+/, '');
  // 회원 데이터(users.*), 숨김 파일(.env, .auth_secret 등), 허용되지 않은 확장자, 폴더 밖 경로는 제공하지 않는다
  const baseName = path.basename(relativePath).toLowerCase();
  const resolvedPath = path.resolve(__dirname, relativePath);
  const blocked = baseName.startsWith('users.')
    || relativePath.split('/').some((seg) => seg.startsWith('.'))
    || !resolvedPath.startsWith(__dirname + path.sep)
    || !MIME_TYPES[path.extname(baseName)];
  if (blocked) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden');
  }

  let filePath = resolvedPath;
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
        'Cache-Control': extname === '.html' ? 'no-cache' : 'public, max-age=300'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`MarketingMap Server running at http://localhost:${PORT}/`);
});
