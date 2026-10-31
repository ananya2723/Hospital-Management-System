// Module: Role 2 - Authentication, Authorization & RFC 7807 Security
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'beahms-super-secret-key-32bytes-minimum-length-2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'bea-hms-refresh-token-secret-key-2026';
const VALID_ROLES = ['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'BILLING'];

function sendRfc7807(res, status, title, detail, req) {
  return res.status(status).json({
    type: 'about:blank',
    title,
    status,
    detail,
    traceId: req ? req.traceId : crypto.randomUUID().slice(0, 8),
    timestamp: new Date().toISOString()
  });
}



function correlationIdMiddleware(req, res, next) {
  const traceId = req.headers['x-correlation-id'] || crypto.randomUUID().slice(0, 8);
  req.traceId = traceId;
  res.setHeader('X-Correlation-Id', traceId);
  next();
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendRfc7807(res, 401, 'Unauthorized', 'Missing or malformed Authorization header with Bearer token', req);
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return sendRfc7807(res, 401, 'Unauthorized', 'Token has expired or is invalid. Please re-authenticate.', req);
    }
    req.user = decoded;
    next();
  });
}

// RBAC Authorization Middleware
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendRfc7807(
        res,
        403,
        'Forbidden',
        `Access denied. Role '${req.user ? req.user.role : 'GUEST'}' does not have sufficient authority. Required: [${roles.join(', ')}]`,
        req
      );
    }
    next();
  };
}


function mountRole2(app, recordAudit) {
// Rate Limiter Simulator for Hardened Gateway (100 req/min)
const rateLimitMap = new Map();
app.use((req, res, next) => {
  const ip = req.ip || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60000;
  const limit = 300;

  let clientRecord = rateLimitMap.get(ip);
  if (!clientRecord || now - clientRecord.startTime > windowMs) {
    clientRecord = { count: 1, startTime: now };
    rateLimitMap.set(ip, clientRecord);
  } else {
    clientRecord.count++;
  }

  if (clientRecord.count > limit) {
    return sendRfc7807(res, 429, 'Too Many Requests', 'Rate limit exceeded: 300 requests per minute', req);
  }
  next();
});

// 1. AUTH SERVICE (/api/v1/auth & /api/v1/users)
// -------------------------------------------------------------
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return sendRfc7807(res, 400, 'Bad Request', 'Email and password are required', req);
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return sendRfc7807(res, 401, 'Unauthorized', 'Invalid email or password', req);
  }

  // Account Lockout Check (5 failed attempts -> 15 min lock)
  const now = new Date();
  if (user.lockedUntil && new Date(user.lockedUntil) > now) {
    const remainingMins = Math.ceil((new Date(user.lockedUntil) - now) / 60000);
    return sendRfc7807(res, 423, 'Account Locked', `Account is locked due to 5 consecutive failed attempts. Try again in ${remainingMins} minute(s).`, req);
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    user.failedAttempts = (user.failedAttempts || 0) + 1;
    if (user.failedAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      return sendRfc7807(res, 423, 'Account Locked', 'Account locked for 15 minutes due to 5 consecutive failed login attempts.', req);
    }
    return sendRfc7807(res, 401, 'Unauthorized', `Invalid credentials. Attempts remaining: ${5 - user.failedAttempts}`, req);
  }

  // Reset failed attempts on success
  user.failedAttempts = 0;
  user.lockedUntil = null;

  const accessToken = jwt.sign(
    { sub: user.id, name: user.name, email: user.email, role: user.role, branchId: user.branchId },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = crypto.randomUUID();
  db.refreshTokens[refreshToken] = { userId: user.id, expiresAt: Date.now() + 7 * 86400000 };

  recordAudit(user.id, user.role, 'USER_LOGIN', 'USER', user.id, req, user.branchId);

  res.json({
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: 900,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId
    }
  });
});

app.post('/api/v1/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !db.refreshTokens[refreshToken]) {
    return sendRfc7807(res, 401, 'Unauthorized', 'Invalid or expired refresh token', req);
  }

  const tokenData = db.refreshTokens[refreshToken];
  if (tokenData.expiresAt < Date.now()) {
    delete db.refreshTokens[refreshToken];
    return sendRfc7807(res, 401, 'Unauthorized', 'Refresh token expired. Please login again.', req);
  }

  const user = db.users.find(u => u.id === tokenData.userId);
  if (!user) {
    return sendRfc7807(res, 401, 'Unauthorized', 'User not found', req);
  }

  // Rotate Refresh Token
  delete db.refreshTokens[refreshToken];
  const newRefreshToken = crypto.randomUUID();
  db.refreshTokens[newRefreshToken] = { userId: user.id, expiresAt: Date.now() + 7 * 86400000 };

  const accessToken = jwt.sign(
    { sub: user.id, name: user.name, email: user.email, role: user.role, branchId: user.branchId },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  res.json({
    accessToken,
    refreshToken: newRefreshToken,
    tokenType: 'Bearer',
    expiresIn: 900
  });
});

app.get('/api/v1/users', authenticateToken, requireRole('ADMIN'), (req, res) => {
  const userList = db.users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    branchId: u.branchId,
    status: u.status,
    lockedUntil: u.lockedUntil
  }));
  res.json(userList);
});

app.post('/api/v1/users', authenticateToken, requireRole('ADMIN'), (req, res) => {
  const { name, email, password, role, branchId } = req.body;
  if (!name || !email || !password || !role) {
    return sendRfc7807(res, 400, 'Bad Request', 'name, email, password, role are required', req);
  }
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return sendRfc7807(res, 409, 'Conflict', 'User with this email already exists', req);
  }
  if (!['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'BILLING'].includes(role)) {
    return sendRfc7807(res, 400, 'Validation Failed', 'role must be ADMIN, DOCTOR, RECEPTIONIST, or BILLING', req);
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return sendRfc7807(res, 400, 'Validation Failed', 'email must be a valid email address', req);
  }

  const newUser = {
    id: 'u-' + crypto.randomUUID().slice(0, 8),
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role,
    branchId: branchId || 101,
    status: 'ACTIVE',
    failedAttempts: 0,
    lockedUntil: null
  };
  db.users.push(newUser);
  recordAudit(req.user.sub, req.user.role, 'USER_CREATE', 'USER', newUser.id, req, newUser.branchId);

  res.status(201).json({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    branchId: newUser.branchId
  });
});

// -------------------------------------------------------------

}

module.exports = {
  JWT_SECRET,
  REFRESH_SECRET,
  VALID_ROLES,
  sendRfc7807,
  correlationIdMiddleware,
  authenticateToken,
  requireRole,
  mount: mountRole2
};
