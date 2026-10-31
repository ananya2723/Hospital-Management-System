// Role 2: Authentication, RBAC, Validation & RFC 7807 Engine
// Extracted from server/server.js

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'bea-hms-enterprise-super-secret-jwt-key-2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'bea-hms-refresh-token-secret-key-2026';
const VALID_ROLES = ['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'BILLING'];

// 1. RFC 7807 Problem Details Error Responder
function sendRfc7807(res, status, title, detail, req) {
  const correlationId = (req && (req.correlationId || req.headers['x-correlation-id'])) || crypto.randomUUID();
  res.setHeader('X-Correlation-Id', correlationId);
  return res.status(status).json({
    type: `https://bea-hms.com/errors/${status}`,
    title,
    status,
    detail,
    instance: req ? req.originalUrl : 'unknown',
    correlationId,
    timestamp: new Date().toISOString()
  });
}

// 2. Correlation ID Middleware
function correlationIdMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
}

// 3. JWT Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendRfc7807(res, 401, 'Unauthorized', 'Missing or malformed Authorization header with Bearer token', req);
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return sendRfc7807(res, 401, 'Unauthorized', 'Invalid or expired access token', req);
    }
    req.user = decoded;
    next();
  });
}

// 4. Role-Based Access Control (RBAC) Guard
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendRfc7807(res, 401, 'Unauthorized', 'Authentication required', req);
    }
    if (!roles.includes(req.user.role)) {
      return sendRfc7807(res, 403, 'Forbidden', `Access denied. Requires one of roles: [${roles.join(', ')}]`, req);
    }
    next();
  };
}

// 5. Auth Routes (Login & Refresh)
function registerAuthRoutes(app, db) {
  app.post('/api/v1/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendRfc7807(res, 400, 'Bad Request', 'email and password are required', req);
    }

    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return sendRfc7807(res, 401, 'Unauthorized', 'Invalid email or password credentials', req);
    }

    const passwordMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!passwordMatch) {
      return sendRfc7807(res, 401, 'Unauthorized', 'Invalid email or password credentials', req);
    }

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      branchId: user.branchId || 101
    };

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ sub: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

    user.refreshToken = refreshToken;

    res.json({
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId || 101
      }
    });
  });

  app.post('/api/v1/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return sendRfc7807(res, 400, 'Bad Request', 'refreshToken is required in request body', req);
    }

    jwt.verify(refreshToken, REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return sendRfc7807(res, 401, 'Unauthorized', 'Invalid or expired refresh token', req);
      }

      const user = db.users.find(u => u.id === decoded.sub && u.refreshToken === refreshToken);
      if (!user) {
        return sendRfc7807(res, 401, 'Unauthorized', 'Refresh token revoked or user not found', req);
      }

      const newAccessToken = jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        branchId: user.branchId || 101
      }, JWT_SECRET, { expiresIn: '1h' });

      res.json({
        accessToken: newAccessToken,
        tokenType: 'Bearer',
        expiresIn: 3600
      });
    });
  });

  // User Management
  app.post('/api/v1/users', authenticateToken, requireRole('ADMIN'), (req, res) => {
    const { name, email, password, role, branchId = 101 } = req.body;
    if (!name || !email || !password || !role) {
      return sendRfc7807(res, 400, 'Validation Failed', 'name, email, password, and role are required', req);
    }
    if (!VALID_ROLES.includes(role)) {
      return sendRfc7807(res, 400, 'Validation Failed', `Role must be one of: ${VALID_ROLES.join(', ')}`, req);
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const newUser = {
      id: 'u-' + crypto.randomUUID().slice(0, 8),
      name,
      email,
      passwordHash,
      role,
      branchId,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    res.status(201).json({ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role });
  });
}

module.exports = {
  sendRfc7807,
  correlationIdMiddleware,
  authenticateToken,
  requireRole,
  registerAuthRoutes
};
