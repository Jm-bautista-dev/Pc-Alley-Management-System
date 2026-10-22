// In-memory rate limiter & account lockout store
// Tracks failed login attempts per IP and per username with sliding window TTL

const ipAttempts = new Map();       // ip -> { count, lastAttempt, blockedUntil, lockoutCount }
const accountAttempts = new Map();  // username -> { count, lastAttempt, blockedUntil, lockoutCount }

const MAX_FAILED_ATTEMPTS = 5;
const CAPTCHA_TRIGGER_ATTEMPTS = 3;
const BASE_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// Periodic cleanup of stale tracking entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipAttempts.entries()) {
    if (now > (data.blockedUntil || 0) && (now - data.lastAttempt > BASE_LOCKOUT_MS)) {
      ipAttempts.delete(ip);
    }
  }
  for (const [user, data] of accountAttempts.entries()) {
    if (now > (data.blockedUntil || 0) && (now - data.lastAttempt > BASE_LOCKOUT_MS)) {
      accountAttempts.delete(user);
    }
  }
}, 10 * 60 * 1000).unref();

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
}

/**
 * Middleware: Check if IP or Account is currently locked out
 * NOTE: Account/IP lockout disabled per administrator request.
 */
function loginRateLimiter(req, res, next) {
  next();
}

/**
 * Record a failed login attempt for IP and username
 * NOTE: Account/IP lockout disabled - always returns non-locked status.
 */
function recordFailedAttempt(req, username) {
  return {
    failedAttempts: 0,
    remainingAttempts: 999,
    isLocked: false,
    requireCaptcha: false
  };
}

/**
 * Reset failed attempt counters upon successful authentication
 */
function recordSuccessfulLogin(req, username) {
  const ip = getClientIp(req);
  const user = String(username || '').trim().toLowerCase();

  ipAttempts.delete(ip);
  if (user) {
    accountAttempts.delete(user);
  }
}

/**
 * Manually unlock account (e.g. after password reset)
 */
function unlockAccount(username, reqOrIp) {
  const user = String(username || '').trim().toLowerCase();
  if (user) {
    accountAttempts.delete(user);
  }
  if (reqOrIp) {
    const ip = typeof reqOrIp === 'string' ? reqOrIp : getClientIp(reqOrIp);
    ipAttempts.delete(ip);
  }
}

module.exports = {
  loginRateLimiter,
  recordFailedAttempt,
  recordSuccessfulLogin,
  unlockAccount
};
