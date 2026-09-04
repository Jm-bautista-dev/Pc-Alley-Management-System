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
 */
function loginRateLimiter(req, res, next) {
  const ip = getClientIp(req);
  const username = String(req.body?.username || '').trim().toLowerCase();
  const now = Date.now();

  // 1. Check IP lockout
  const ipData = ipAttempts.get(ip);
  if (ipData && ipData.blockedUntil && now < ipData.blockedUntil) {
    const remainingSec = Math.ceil((ipData.blockedUntil - now) / 1000);
    res.set('Retry-After', String(remainingSec));
    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Too many failed login attempts from this network. Access suspended for ${remainingSec} seconds.`,
      retryAfter: remainingSec,
      lockedUntil: new Date(ipData.blockedUntil).toISOString()
    });
  }

  // 2. Check Account lockout
  if (username) {
    const accData = accountAttempts.get(username);
    if (accData && accData.blockedUntil && now < accData.blockedUntil) {
      const remainingSec = Math.ceil((accData.blockedUntil - now) / 1000);
      res.set('Retry-After', String(remainingSec));
      return res.status(429).json({
        error: 'Account Temporarily Locked',
        message: `Account "${username}" is temporarily locked due to repeated failed login attempts. Try again in ${remainingSec} seconds.`,
        retryAfter: remainingSec,
        lockedUntil: new Date(accData.blockedUntil).toISOString()
      });
    }
  }

  next();
}

/**
 * Record a failed login attempt for IP and username
 */
function recordFailedAttempt(req, username) {
  const ip = getClientIp(req);
  const user = String(username || '').trim().toLowerCase();
  const now = Date.now();

  // Update IP attempts
  let ipData = ipAttempts.get(ip) || { count: 0, lastAttempt: now, blockedUntil: null, lockoutCount: 0 };
  ipData.count += 1;
  ipData.lastAttempt = now;
  if (ipData.count >= MAX_FAILED_ATTEMPTS) {
    ipData.lockoutCount += 1;
    const duration = BASE_LOCKOUT_MS * Math.pow(2, ipData.lockoutCount - 1);
    ipData.blockedUntil = now + duration;
  }
  ipAttempts.set(ip, ipData);

  // Update Account attempts
  let accData = null;
  if (user) {
    accData = accountAttempts.get(user) || { count: 0, lastAttempt: now, blockedUntil: null, lockoutCount: 0 };
    accData.count += 1;
    accData.lastAttempt = now;
    if (accData.count >= MAX_FAILED_ATTEMPTS) {
      accData.lockoutCount += 1;
      const duration = BASE_LOCKOUT_MS * Math.pow(2, accData.lockoutCount - 1);
      accData.blockedUntil = now + duration;
    }
    accountAttempts.set(user, accData);
  }

  const highestCount = Math.max(ipData.count, accData?.count || 0);
  const isLocked = Boolean(ipData.blockedUntil || accData?.blockedUntil);
  const requireCaptcha = highestCount >= CAPTCHA_TRIGGER_ATTEMPTS;

  return {
    failedAttempts: highestCount,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - highestCount),
    isLocked,
    requireCaptcha
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
