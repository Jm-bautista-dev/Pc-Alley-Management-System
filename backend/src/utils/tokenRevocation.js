// In-memory token revocation cache backed by database persistence
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const revokedTokens = new Map(); // tokenHash/sessionId -> expiresAtMs

// Periodic cleanup of expired entries in memory cache every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, expiresAt] of revokedTokens.entries()) {
    if (now > expiresAt) {
      revokedTokens.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

const hashToken = (token) => {
  if (!token) return '';
  return crypto.createHash('sha256').update(String(token).trim()).digest('hex');
};

/**
 * Revoke a token or session until its expiration time
 * @param {string} token 
 * @param {number} [expiresAtMs]
 * @param {string} [sessionId]
 */
function revokeToken(token, expiresAtMs, sessionId) {
  if (!token && !sessionId) return;
  const tokenStr = token ? String(token).trim() : '';
  const tokenHash = tokenStr ? hashToken(tokenStr) : '';
  
  let expiry = expiresAtMs;
  let decodedSessionId = sessionId;

  if (tokenStr) {
    try {
      const decoded = jwt.decode(tokenStr);
      if (decoded) {
        if (decoded.exp && !expiry) {
          expiry = decoded.exp * 1000;
        }
        if (decoded.sessionId && !decodedSessionId) {
          decodedSessionId = decoded.sessionId;
        }
      }
    } catch (e) {}
  }
  
  // Default to 24 hours if expiration cannot be determined
  if (!expiry || Number.isNaN(expiry)) {
    expiry = Date.now() + 24 * 60 * 60 * 1000;
  }

  if (tokenStr) {
    revokedTokens.set(tokenStr, expiry);
    if (tokenHash) revokedTokens.set(tokenHash, expiry);
  }

  if (decodedSessionId) {
    revokedTokens.set(decodedSessionId, expiry);
  }

  // Persist revocation in UserSession model asynchronously
  try {
    const { UserSession } = require('../models');
    if (UserSession) {
      const orConditions = [];
      if (decodedSessionId) orConditions.push({ id: decodedSessionId });
      if (tokenHash) orConditions.push({ token_hash: tokenHash });

      if (orConditions.length > 0) {
        const { Op } = require('sequelize');
        UserSession.update(
          { is_active: false },
          { where: { [Op.or]: orConditions } }
        ).catch(err => {
          // Non-fatal, in-memory cache already prevents usage
          console.warn('[AUTH] Database session deactivation warning:', err.message);
        });
      }
    }
  } catch (e) {}
}

/**
 * Check if a token or session has been revoked
 * @param {string} token 
 * @param {string} [sessionId]
 * @returns {boolean}
 */
function isTokenRevoked(token, sessionId) {
  const now = Date.now();

  if (sessionId && revokedTokens.has(sessionId)) {
    const expiresAt = revokedTokens.get(sessionId);
    if (now > expiresAt) {
      revokedTokens.delete(sessionId);
    } else {
      return true;
    }
  }

  if (token) {
    const tokenStr = String(token).trim();
    if (revokedTokens.has(tokenStr)) {
      const expiresAt = revokedTokens.get(tokenStr);
      if (now > expiresAt) {
        revokedTokens.delete(tokenStr);
      } else {
        return true;
      }
    }

    const tokenHash = hashToken(tokenStr);
    if (tokenHash && revokedTokens.has(tokenHash)) {
      const expiresAt = revokedTokens.get(tokenHash);
      if (now > expiresAt) {
        revokedTokens.delete(tokenHash);
      } else {
        return true;
      }
    }
  }

  return false;
}

/**
 * Clear all revoked tokens (useful for testing)
 */
function clearRevocations() {
  revokedTokens.clear();
}

module.exports = {
  hashToken,
  revokeToken,
  isTokenRevoked,
  clearRevocations
};
