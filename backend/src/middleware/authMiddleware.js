const jwt = require('jsonwebtoken');
const { isTokenRevoked } = require('../utils/tokenRevocation');
const { UserSession } = require('../models');

// In-memory LRU-style cache for active sessions to prevent database lookup on every single request
const activeSessionCache = new Map(); // sessionId -> { userId, expiresAtMs, lastActivityMs, isActive }
const SESSION_CACHE_TTL_MS = 30 * 1000; // 30 seconds

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
    return res.status(401).json({ 
      message: 'Session expired. Please log in again.', 
      code: 'UNAUTHORIZED' 
    });
  }

  // 3. Fast check if token or token hash was revoked
  if (isTokenRevoked(token)) {
    return res.status(401).json({ 
      message: 'Session expired. Please log in again.',
      code: 'SESSION_REVOKED'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      // User-friendly message without exposing raw internal error strings
      return res.status(401).json({ 
        message: 'Session expired. Please log in again.',
        code: 'SESSION_EXPIRED'
      });
    }

    // 4. Server-Side Session Validation if token has a sessionId
    if (user.sessionId) {
      // Check if session ID was revoked
      if (isTokenRevoked(null, user.sessionId)) {
        return res.status(401).json({
          message: 'Session expired. Please log in again.',
          code: 'SESSION_REVOKED'
        });
      }

      const now = Date.now();
      const cached = activeSessionCache.get(user.sessionId);

      if (cached && now - cached.cachedAt < SESSION_CACHE_TTL_MS) {
        if (!cached.isActive || cached.expiresAtMs < now) {
          activeSessionCache.delete(user.sessionId);
          return res.status(401).json({
            message: 'Session expired. Please log in again.',
            code: 'SESSION_EXPIRED'
          });
        }
        req.session = { id: user.sessionId, expires_at: new Date(cached.expiresAtMs) };
      } else {
        try {
          const session = await UserSession.findByPk(user.sessionId);
          if (!session || !session.is_active) {
            activeSessionCache.delete(user.sessionId);
            return res.status(401).json({
              message: 'Session expired. Please log in again.',
              code: 'SESSION_INVALID'
            });
          }

          const expiresAtMs = new Date(session.expires_at).getTime();
          if (expiresAtMs < now) {
            activeSessionCache.delete(user.sessionId);
            return res.status(401).json({
              message: 'Session expired. Please log in again.',
              code: 'SESSION_EXPIRED'
            });
          }

          activeSessionCache.set(user.sessionId, {
            userId: session.user_id,
            expiresAtMs,
            lastActivityMs: new Date(session.last_activity_at).getTime(),
            isActive: session.is_active,
            cachedAt: now
          });

          req.session = session;

          // Throttled update of last_activity_at in database (once per minute)
          if (now - new Date(session.last_activity_at).getTime() > 60000) {
            UserSession.update(
              { last_activity_at: new Date() },
              { where: { id: user.sessionId } }
            ).catch(() => {});
          }
        } catch (dbErr) {
          // If DB is temporarily unreachable, fallback to verified JWT payload to prevent hard outages
          console.warn('[AUTH] Database session check fallback:', dbErr.message);
        }
      }
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
      return res.status(403).json({ 
        message: 'Access denied: Insufficient permissions for this resource.',
        code: 'FORBIDDEN'
      });
    }
    next();
  };
};

function invalidateSessionCache(sessionId) {
  if (sessionId) activeSessionCache.delete(sessionId);
}

function invalidateAllUserSessionsCache(userId) {
  if (!userId) return;
  for (const [sId, entry] of activeSessionCache.entries()) {
    if (entry.userId === userId) {
      activeSessionCache.delete(sId);
    }
  }
}

module.exports = { 
  authenticateToken, 
  authorizeRoles,
  activeSessionCache,
  invalidateSessionCache,
  invalidateAllUserSessionsCache
};

