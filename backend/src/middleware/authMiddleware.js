const jwt = require('jsonwebtoken');
const { isTokenRevoked } = require('../utils/tokenRevocation');

const authenticateToken = (req, res, next) => {
  // 1. Check HttpOnly cookies first
  let token = req.cookies?.token || req.cookies?.access_token || null;

  // 2. Fall back to Authorization headers or query param
  if (!token) {
    const authHeader = req.headers['authorization'] || 
                       req.headers['x-access-token'] || 
                       req.headers['x-auth-token'] || 
                       req.headers['token'] || 
                       req.headers['x-token'];

    if (authHeader) {
      token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }
  }

  if (!token) {
    console.warn(`[AUTH] Missing token for ${req.method} ${req.url}. Available headers:`, Object.keys(req.headers));
    return res.status(401).json({ message: 'Access denied, token missing' });
  }

  // 3. Check if token was revoked upon logout
  if (isTokenRevoked(token)) {
    console.warn(`[AUTH] Rejected revoked token for ${req.method} ${req.url}`);
    return res.status(401).json({ 
      message: 'Session has been revoked. Please log in again.',
      code: 'SESSION_REVOKED'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error(`[AUTH] Token validation failed for ${req.url}: ${err.message}`);
      // Return the specific error message to help debug (e.g., "jwt expired", "invalid signature")
      return res.status(403).json({ 
        message: 'Token invalid or expired',
        details: err.message,
        hint: 'Please try logging out and logging back in.'
      });
    }
    req.user = user;
    req.rawToken = token;
    next();
  });
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Normalize role for robust comparison
    const userRole = (req.user?.role || '').toLowerCase();
    const allowedRoles = roles.map(r => r.toLowerCase());

    if (!allowedRoles.includes(userRole)) {
      console.warn(`[AUTH] Access Denied: User '${req.user?.username}' with role '${userRole}' attempted to access a resource requiring [${roles.join(', ')}]`);
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };
