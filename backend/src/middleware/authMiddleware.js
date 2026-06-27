const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access denied, token missing' });

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
