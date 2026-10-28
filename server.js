const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3000;
const USERS_DB_PATH = path.join(__dirname, 'users.json');

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

      if (!name) {
        return sendJson(res, 400, { ok: false, message: '대표자 성함을 입력해 주세요.' });
      }
      if (!email || !email.includes('@')) {
        return sendJson(res, 400, { ok: false, message: '유효한 이메일 주소를 입력해 주세요.' });
      }
      if (password.length < 6) {
        return sendJson(res, 400, { ok: false, message: '비밀번호는 6자 이상 입력해 주세요.' });
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
        provider: 'email',
        createdAt: now,
        lastLoginAt: now
      };

      users.push(newUser);
      saveUsers(users);

      const token = Buffer.from(`${newUser.id}:${newUser.email}:${Date.now()}`).toString('base64');
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

      const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString('base64');
      return sendJson(res, 200, {
        ok: true,
        message: `${user.name}님, 환영합니다!`,
        token,
        user: {
          id: user.id,
          name: user.name,
          brand: user.brand || '',
          email: user.email,
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
      const provider = (body.provider || 'social').trim();
      const name = (body.name || `${provider} 대표`).trim();
      const brand = (body.brand || '').trim();
      const email = (body.email || `${provider.toLowerCase()}_${Date.now()}@social.marketingmap.kr`).trim().toLowerCase();

      const users = loadUsers();
      let user = users.find(u => u.email.toLowerCase() === email);
      const now = new Date().toISOString();

      if (!user) {
        user = {
          id: 'usr_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
          name,
          brand,
          email,
          passwordHash: hashPassword(crypto.randomBytes(12).toString('hex')),
          marketingOptIn: true,
          provider,
          createdAt: now,
          lastLoginAt: now
        };
        users.push(user);
      } else {
        if (name) user.name = name;
        if (brand) user.brand = brand;
        user.lastLoginAt = now;
      }
      saveUsers(users);

      const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString('base64');
      return sendJson(res, 200, {
        ok: true,
        message: `${user.name}님, ${provider} 계정으로 시작합니다!`,
        token,
        user: {
          id: user.id,
          name: user.name,
          brand: user.brand || '',
          email: user.email,
          provider: user.provider,
          createdAt: user.createdAt
        }
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, message: '소셜 인증 처리 중 오류가 발생했습니다.' });
    }
  }

  // --- STATIC FILE SERVING ---
  const relativePath = reqPath === '/' ? 'index.html' : reqPath.replace(/^\/+/, '');
  // Prevent access to users.json directly via static serving
  if (relativePath.toLowerCase() === 'users.json') {
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
