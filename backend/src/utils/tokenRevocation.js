// In-memory token revocation store with TTL expiration cleanup
const jwt = require('jsonwebtoken');

const revokedTokens = new Map(); // tokenHash/tokenString -> expiresAtMs

// Periodic cleanup of expired revoked tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of revokedTokens.entries()) {
    if (now > expiresAt) {
      revokedTokens.delete(token);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Revoke a token until its expiration time
 * @param {string} token 
 * @param {number} [expiresAtMs]
 */
function revokeToken(token, expiresAtMs) {
  if (!token) return;
  const tokenStr = String(token).trim();
  
  let expiry = expiresAtMs;
  if (!expiry) {
    try {
      const decoded = jwt.decode(tokenStr);
      if (decoded && decoded.exp) {
        expiry = decoded.exp * 1000;
      }
    } catch (e) {}
  }
  
  // Default to 24 hours if expiration cannot be decoded
  if (!expiry || Number.isNaN(expiry)) {
    expiry = Date.now() + 24 * 60 * 60 * 1000;
  }

  revokedTokens.set(tokenStr, expiry);
}

/**
 * Check if a token has been revoked
 * @param {string} token 
 * @returns {boolean}
 */
function isTokenRevoked(token) {
  if (!token) return false;
  const tokenStr = String(token).trim();
  const expiresAt = revokedTokens.get(tokenStr);
  if (!expiresAt) return false;

  if (Date.now() > expiresAt) {
    revokedTokens.delete(tokenStr);
    return false;
  }

  return true;
}

/**
 * Clear all revoked tokens (useful for testing)
 */
function clearRevocations() {
  revokedTokens.clear();
}

module.exports = {
  revokeToken,
  isTokenRevoked,
  clearRevocations
};
