const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Branch, AuditLog } = require('../models');
const pagination = require('../utils/pagination');
const sequelize = require('../db');
const {
  recordFailedAttempt,
  recordSuccessfulLogin,
  unlockAccount
} = require('../middleware/loginRateLimiter');

// In-memory store for active password reset tokens
const passwordResetTokens = new Map(); // identifier -> { token, expiresAt, userId }

const normalizeBranchId = (value) => {
  if (value === '' || value === null || typeof value === 'undefined') {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
};

const register = async (req, res) => {
  try {
    const { password, role, branch_id } = req.body;
    const username = String(req.body.username || '').trim().toLowerCase();
    const firstName = String(req.body.first_name || '').trim();
    const lastName = String(req.body.last_name || '').trim();

    if (!username) {
      return res.status(400).json({ message: 'Username or internal ID is required' });
    }

    if (!firstName) {
      return res.status(400).json({ message: 'First name is required' });
    }
    if (/\d/.test(firstName) || !/^[A-Za-z\s.\'-]+$/.test(firstName) || firstName.length < 2 || firstName.length > 50) {
      return res.status(400).json({ message: 'First name can only contain letters, spaces, hyphens, apostrophes, and dots (2-50 chars, no numbers)' });
    }

    if (!lastName) {
      return res.status(400).json({ message: 'Last name is required' });
    }
    if (/\d/.test(lastName) || !/^[A-Za-z\s.\'-]+$/.test(lastName) || lastName.length < 2 || lastName.length > 50) {
      return res.status(400).json({ message: 'Last name can only contain letters, spaces, hyphens, apostrophes, and dots (2-50 chars, no numbers)' });
    }

    const allowedRolesByCreator = {
      super_admin: ['branch_admin', 'employee'],
      branch_admin: ['employee']
    };

    const allowedRoles = allowedRolesByCreator[req.user.role] || [];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        message: req.user.role === 'branch_admin'
          ? 'Managers can only provision Staff accounts'
          : 'Admins can only provision Manager or Staff accounts'
      });
    }

    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedBranchId = req.user.role === 'branch_admin'
      ? normalizeBranchId(req.user.branch_id)
      : normalizeBranchId(branch_id);

    if (normalizedBranchId === null) {
      return res.status(400).json({ message: 'A branch assignment is required for Manager and Staff accounts' });
    }

    if (Number.isNaN(normalizedBranchId)) {
      return res.status(400).json({ message: 'Invalid branch assignment' });
    }

    if (req.user.role === 'branch_admin' && normalizedBranchId !== Number(req.user.branch_id)) {
      return res.status(403).json({ message: 'Managers can only provision accounts for their own sector' });
    }

    const branch = await Branch.findByPk(normalizedBranchId);
    if (!branch) {
      return res.status(404).json({ message: 'Assigned branch does not exist' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      first_name: firstName,
      last_name: lastName,
      username,
      password: hashedPassword,
      role,
      branch_id: normalizedBranchId
    });
    res.status(201).json({ message: 'User provisioned successfully', userId: user.id });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'A duplicate database value blocked this registration. Please restart the backend so account migrations can run, then try again.' });
    }

    res.status(500).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { password } = req.body;
    const username = String(req.body.username || '').trim().toLowerCase();
    const matchingUsers = await User.findAll({
      where: { username },
      include: [Branch],
      order: [['id', 'ASC']]
    });

    if (!matchingUsers.length) {
      console.warn(`[AUTH] Login failed: User not found for username: ${username}`);
      const attemptInfo = recordFailedAttempt(req, username);
      if (attemptInfo.isLocked) {
        return res.status(429).json({
          error: 'Account Temporarily Locked',
          message: 'Account temporarily locked due to repeated failed login attempts. Try again in 15 minutes.',
          requireCaptcha: true
        });
      }
      return res.status(401).json({
        message: 'Incorrect Username or Password',
        failedAttempts: attemptInfo.failedAttempts,
        remainingAttempts: attemptInfo.remainingAttempts,
        attemptsRemaining: attemptInfo.remainingAttempts,
        requireCaptcha: attemptInfo.requireCaptcha
      });
    }

    let user = null;
    for (const candidate of matchingUsers) {
      const passwordMatch = await bcrypt.compare(password, candidate.password);
      if (passwordMatch) {
        user = candidate;
        break;
      }
    }

    if (!user) {
      console.warn(`[AUTH] Login failed: Password mismatch for user: ${username}`);
      const attemptInfo = recordFailedAttempt(req, username);
      if (attemptInfo.isLocked) {
        return res.status(429).json({
          error: 'Account Temporarily Locked',
          message: 'Account temporarily locked due to repeated failed login attempts. Try again in 15 minutes.',
          requireCaptcha: true
        });
      }
      return res.status(401).json({
        message: 'Incorrect Username or Password',
        failedAttempts: attemptInfo.failedAttempts,
        remainingAttempts: attemptInfo.remainingAttempts,
        attemptsRemaining: attemptInfo.remainingAttempts,
        requireCaptcha: attemptInfo.requireCaptcha
      });
    }

    // Reset failed attempt counters upon successful login
    recordSuccessfulLogin(req, username);

    console.log(`[AUTH] User successfully authenticated: ${username} (Role: ${user.role})`);

    if (!process.env.JWT_SECRET) {
      console.error('[AUTH] FATAL ERROR: JWT_SECRET is not defined in environment variables.');
      throw new Error('Server identity check failed. Please contact administrator.');
    }

    const token = jwt.sign(
      {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        role: user.role,
        branch_id: user.branch_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set secure HttpOnly cookie for XSS protection
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      token,
      user: {
        id: user.id,
        first_name: user.first_name || 'Admin',
        last_name: user.last_name || 'User',
        username: user.username,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.Branch ? user.Branch.name : 'All'
      }
    });
  } catch (error) {
    const errMsg = error.original?.message || error.message || error.name || 'Database query error';
    console.error(`[AUTH] Critical server error during login: ${errMsg}`, error);
    res.status(500).json({
      error: errMsg,
      message: `System Error: ${errMsg}`
    });
  }
};

const logout = async (req, res) => {
  try {
    const { revokeToken } = require('../utils/tokenRevocation');
    const token = req.rawToken || req.cookies?.token || (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '').trim() : null);

    if (token) {
      revokeToken(token);
    }

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    if (req.user) {
      await AuditLog.create({
        action: 'USER_LOGOUT',
        user_id: req.user.id,
        details: `User ${req.user.username} logged out. Session revoked.`,
        ip_address: req.ip
      }).catch(e => console.warn('[AUTH] AuditLog error:', e.message));
    }

    res.json({ message: 'Logged out successfully. Session invalidated.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const { branch_id } = req.query;
    const { offset, where, order, page: pageNum, limit: limitNum } = pagination({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      searchableFields: ['username', 'first_name', 'last_name']
    });
    // Apply role‑based branch filter
    if (req.user.role === 'branch_admin') {
      where.branch_id = req.user.branch_id;
    } else if (branch_id) {
      const normalizedBranchId = normalizeBranchId(branch_id);
      if (normalizedBranchId === null || Number.isNaN(normalizedBranchId)) {
        return res.status(400).json({ message: 'Invalid branch filter' });
      }
      where.branch_id = normalizedBranchId;
    }
    const { count, rows } = await User.findAndCountAll({
      where,
      include: [Branch],
      attributes: { exclude: ['password'] },
      offset,
      limit: limitNum,
      order
    });
    res.json({
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { first_name, last_name } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (first_name !== undefined) {
      const fn = String(first_name).trim();
      if (!fn || /\d/.test(fn) || !/^[A-Za-z\s.\'-]+$/.test(fn) || fn.length < 2 || fn.length > 50) {
        return res.status(400).json({ message: 'First name can only contain letters, spaces, hyphens, apostrophes, and dots (2-50 chars, no numbers)' });
      }
      user.first_name = fn;
    }
    if (last_name !== undefined) {
      const ln = String(last_name).trim();
      if (!ln || /\d/.test(ln) || !/^[A-Za-z\s.\'-]+$/.test(ln) || ln.length < 2 || ln.length > 50) {
        return res.status(400).json({ message: 'Last name can only contain letters, spaces, hyphens, apostrophes, and dots (2-50 chars, no numbers)' });
      }
      user.last_name = ln;
    }
    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        role: user.role,
        branch_id: user.branch_id
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const identifier = String(req.body.email || req.body.username || '').trim().toLowerCase();
    if (!identifier) {
      return res.status(400).json({ message: 'Email or username is required' });
    }

    // Find user by username
    const user = await User.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('username')), identifier)
    });

    // Generate secure 6-digit cryptographic token
    const token = String(crypto.randomInt(100000, 999999));
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

    if (user) {
      passwordResetTokens.set(identifier, {
        token,
        expiresAt,
        userId: user.id
      });

      await AuditLog.create({
        action: 'PASSWORD_RESET_REQUESTED',
        user_id: user.id,
        details: `Password recovery token issued for ${identifier}`,
        ip_address: req.ip
      }).catch(e => console.warn('[AUTH] AuditLog error:', e.message));

      console.log(`[AUTH] Recovery token generated for ${identifier}: ${token} (expires in 15m)`);
    }

    // Return generic success to protect user privacy
    res.json({
      message: 'If an account with this identity exists, a recovery token has been transmitted.',
      debugToken: process.env.NODE_ENV !== 'production' ? token : undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const verifyResetToken = async (req, res) => {
  try {
    const identifier = String(req.body.email || req.body.username || '').trim().toLowerCase();
    const token = String(req.body.token || '').trim();

    if (!identifier || !token) {
      return res.status(400).json({ message: 'Email/username and recovery token are required' });
    }

    const record = passwordResetTokens.get(identifier);
    if (!record || record.token !== token) {
      return res.status(400).json({ message: 'Invalid or incorrect recovery token' });
    }

    if (Date.now() > record.expiresAt) {
      passwordResetTokens.delete(identifier);
      return res.status(400).json({ message: 'Recovery token has expired. Please request a new token.' });
    }

    res.json({ valid: true, message: 'Recovery token verified successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const identifier = String(req.body.email || req.body.username || '').trim().toLowerCase();
    const token = String(req.body.token || '').trim();
    const newPassword = String(req.body.newPassword || req.body.password || '');

    if (!identifier || !token || !newPassword) {
      return res.status(400).json({ message: 'Identifier, token, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const record = passwordResetTokens.get(identifier);
    if (!record || record.token !== token) {
      return res.status(400).json({ message: 'Invalid or expired recovery token' });
    }

    if (Date.now() > record.expiresAt) {
      passwordResetTokens.delete(identifier);
      return res.status(400).json({ message: 'Recovery token has expired' });
    }

    const user = await User.findByPk(record.userId);
    if (!user) {
      return res.status(404).json({ message: 'Account no longer exists' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Invalidate reset token and unlock account lockout
    passwordResetTokens.delete(identifier);
    unlockAccount(identifier, req);
    unlockAccount(user.username, req);

    await AuditLog.create({
      action: 'PASSWORD_RESET_COMPLETED',
      user_id: user.id,
      details: `Password reset completed for ${user.username}`,
      ip_address: req.ip
    }).catch(e => console.warn('[AUTH] AuditLog error:', e.message));

    console.log(`[AUTH] Password reset successfully for user ${user.username}`);
    res.json({ message: 'Password has been successfully updated. You may now log in.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  register,
  login,
  logout,
  getUsers,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyResetToken,
  resetPassword
};
