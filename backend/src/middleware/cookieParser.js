/**
 * Lightweight cookie parser middleware
 * Parses `Cookie` header into `req.cookies` object
 */
function cookieParser(req, res, next) {
  req.cookies = req.cookies || {};
  const cookieHeader = req.headers.cookie;

  if (cookieHeader) {
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const [key, ...values] = pair.trim().split('=');
      if (key) {
        req.cookies[key.trim()] = decodeURIComponent(values.join('='));
      }
    }
  }

  // Ensure helper for setting HttpOnly cookies if not present
  if (!res.cookie) {
    res.cookie = function(name, value, options = {}) {
      const parts = [`${name}=${encodeURIComponent(value)}`];
      if (options.maxAge) parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
      if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
      if (options.httpOnly) parts.push('HttpOnly');
      if (options.secure) parts.push('Secure');
      if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
      parts.push(`Path=${options.path || '/'}`);
      res.setHeader('Set-Cookie', parts.join('; '));
    };
  }

  // Ensure helper for clearing cookie if not present
  if (!res.clearCookie) {
    res.clearCookie = function(name, options = {}) {
      const parts = [`${name}=`, 'Max-Age=0', 'Expires=Thu, 01 Jan 1970 00:00:00 GMT'];
      if (options.httpOnly) parts.push('HttpOnly');
      if (options.secure) parts.push('Secure');
      if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
      parts.push(`Path=${options.path || '/'}`);
      res.setHeader('Set-Cookie', parts.join('; '));
    };
  }

  next();
}

module.exports = cookieParser;
