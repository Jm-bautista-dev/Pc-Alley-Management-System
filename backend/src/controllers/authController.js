const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Branch, AuditLog, UserSession, Role, UserRole } = require('../models');
const { hashToken, revokeToken } = require('../utils/tokenRevocation');
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
      super_admin: ['super_admin', 'branch_admin', 'employee'],
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

    if (req.user.role === 'branch_admin') {
      const requestedBranchId = normalizeBranchId(branch_id);
      if (requestedBranchId !== null && requestedBranchId !== Number(req.user.branch_id)) {
        return res.status(403).json({ message: 'Managers can only provision accounts for their own sector' });
      }
    }

    const normalizedBranchId = req.user.role === 'branch_admin'
      ? normalizeBranchId(req.user.branch_id)
      : normalizeBranchId(branch_id);

    if (role !== 'super_admin' && normalizedBranchId === null) {
      return res.status(400).json({ message: 'A branch assignment is required for Manager and Staff accounts' });
    }

    if (normalizedBranchId !== null && Number.isNaN(normalizedBranchId)) {
      return res.status(400).json({ message: 'Invalid branch assignment' });
    }

    if (normalizedBranchId !== null) {
      const branch = await Branch.findByPk(normalizedBranchId);
      if (!branch) {
        return res.status(404).json({ message: 'Assigned branch does not exist' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const targetRoleRecord = await Role.findOne({ where: { name: role } });

    const newUser = await sequelize.transaction(async (t) => {
      const createdUser = await User.create({
        first_name: firstName,
        last_name: lastName,
        username,
        password: hashedPassword,
        role,
        branch_id: normalizedBranchId
      }, { transaction: t });

      if (targetRoleRecord) {
        await UserRole.create({
          user_id: createdUser.id,
          role_id: targetRoleRecord.id
        }, { transaction: t });
      }

      return createdUser;
    });

    await AuditLog.create({
      action: 'USER_PROVISIONED',
      user_id: req.user.id,
      details: `Provisioned ${role} account for ${username} (Branch: ${normalizedBranchId || 'HQ'})`,
      ip_address: req.ip
    }).catch(e => console.warn('[AUTH] AuditLog error:', e.message));

    res.status(201).json({ message: 'User provisioned successfully', userId: newUser.id });
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
      include: [
        Branch,
        {
          model: Role,
          as: 'roles',
          attributes: ['id', 'name', 'display_name', 'description'],
          through: { attributes: [] }
        }
      ],
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

    const userRoles = user.roles && user.roles.length
      ? user.roles.map(r => r.name)
      : [user.role];
    const primaryRole = userRoles[0] || user.role;

    console.log(`[AUTH] User successfully authenticated: ${username} (Role: ${primaryRole}, Roles: ${userRoles.join(', ')})`);

    if (!process.env.JWT_SECRET) {
      console.error('[AUTH] FATAL ERROR: JWT_SECRET is not defined in environment variables.');
      throw new Error('Server identity check failed. Please contact administrator.');
    }

    // Generate cryptographically secure unique session ID (UUID v4)
    const sessionId = crypto.randomUUID();

    // Session Rotation: Invalidate previous active sessions for this user to enforce fresh session creation
    try {
      const { invalidateAllUserSessionsCache } = require('../middleware/authMiddleware');
      if (typeof invalidateAllUserSessionsCache === 'function') {
        invalidateAllUserSessionsCache(user.id);
      }
      if (UserSession) {
        await UserSession.update(
          { is_active: false },
          { where: { user_id: user.id, is_active: true } }
        );
      }
    } catch (rotErr) {
      console.warn('[AUTH] Session rotation notice:', rotErr.message);
    }

    const token = jwt.sign(
      {
        id: user.id,
        sessionId,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        role: primaryRole,
        roles: userRoles,
        branch_id: user.branch_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Persist new session in database
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tokenHash = hashToken(token);
    try {
      if (UserSession) {
        await UserSession.create({
          id: sessionId,
          user_id: user.id,
          token_hash: tokenHash,
          ip_address: req.ip || req.connection?.remoteAddress || null,
          user_agent: req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 500) : null,
          is_active: true,
          expires_at: expiresAt,
          last_activity_at: new Date()
        });
      }
    } catch (sessErr) {
      console.warn('[AUTH] UserSession creation notice:', sessErr.message);
    }

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
      sessionId,
      user: {
        id: user.id,
        first_name: user.first_name || 'Admin',
        last_name: user.last_name || 'User',
        username: user.username,
        role: primaryRole,
        roles: user.roles && user.roles.length
          ? user.roles.map(r => ({ id: r.id, name: r.name, display_name: r.display_name }))
          : [{ name: primaryRole, display_name: primaryRole }],
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
    const token = req.rawToken || req.cookies?.token || (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '').trim() : null);
    const sessionId = req.session?.id || req.user?.sessionId || null;

    if (token || sessionId) {
      revokeToken(token, null, sessionId);
    }

    try {
      const { invalidateSessionCache, invalidateAllUserSessionsCache } = require('../middleware/authMiddleware');
      if (sessionId && typeof invalidateSessionCache === 'function') {
        invalidateSessionCache(sessionId);
      }
      if (req.user?.id && typeof invalidateAllUserSessionsCache === 'function') {
        invalidateAllUserSessionsCache(req.user.id);
      }
    } catch (cErr) {}

    if (sessionId && UserSession) {
      await UserSession.update(
        { is_active: false },
        { where: { id: sessionId } }
      ).catch(() => {});
    } else if (req.user?.id && UserSession) {
      await UserSession.update(
        { is_active: false },
        { where: { user_id: req.user.id } }
      ).catch(() => {});
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

const getSession = async (req, res) => {
  try {
    const userRoles = Array.isArray(req.user.roles) && req.user.roles.length
      ? req.user.roles
      : [req.user.role];
    const primaryRole = req.user.role || userRoles[0];

    res.json({
      valid: true,
      user: {
        id: req.user.id,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        username: req.user.username,
        role: primaryRole,
        roles: userRoles,
        branch_id: req.user.branch_id
      },
      session: {
        id: req.session?.id || req.user?.sessionId || null,
        expiresAt: req.session?.expires_at || null
      }
    });
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
    // Apply role-based branch filter
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
      include: [
        Branch,
        {
          model: Role,
          as: 'roles',
          attributes: ['id', 'name', 'display_name', 'description'],
          through: { attributes: [] }
        }
      ],
      attributes: { exclude: ['password'] },
      offset,
      limit: limitNum,
      order,
      distinct: true
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

const getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      order: [['id', 'ASC']]
    });

    // Compute user counts per role from user_roles
    const roleCounts = await sequelize.query(`
      SELECT r.id, r.name, COUNT(ur.user_id) AS user_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      GROUP BY r.id, r.name
    `, { type: sequelize.QueryTypes.SELECT });

    const countMap = {};
    for (const rc of roleCounts) {
      countMap[rc.id] = parseInt(rc.user_count || 0, 10);
    }

    const data = roles.map(r => ({
      id: r.id,
      name: r.name,
      display_name: r.display_name,
      description: r.description,
      user_count: countMap[r.id] || 0
    }));

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const { role: newRoleName } = req.body;

    if (!newRoleName) {
      return res.status(400).json({ message: 'Target role designation is required' });
    }

    const normalizedNewRole = String(newRoleName).trim().toLowerCase();

    // 1. Prevent self-role modification (prevent privilege escalation or self-lockout)
    if (req.user.id === targetUserId) {
      return res.status(400).json({ message: 'Cannot modify your own account role' });
    }

    // 2. Fetch target user with branch and roles
    const targetUser = await User.findByPk(targetUserId, {
      include: [Branch, { model: Role, as: 'roles' }]
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 3. Find target Role in database
    const targetRoleRecord = await Role.findOne({
      where: { name: normalizedNewRole }
    });

    if (!targetRoleRecord) {
      return res.status(400).json({ message: `Role '${normalizedNewRole}' is not a valid system role` });
    }

    // 4. Server-Side Authorization: Protect Super Admin accounts & enforce role boundaries
    if (req.user.role === 'branch_admin') {
      // Branch Admin cannot modify Super Admin or other Branch Admins
      if (targetUser.role === 'super_admin' || targetUser.role === 'branch_admin') {
        return res.status(403).json({
          message: 'Access denied: Branch Managers cannot modify Super Admin or Manager accounts'
        });
      }

      // Branch Admin cannot modify users outside their assigned branch
      if (Number(targetUser.branch_id) !== Number(req.user.branch_id)) {
        return res.status(403).json({
          message: 'Access denied: Cannot modify users from other branches'
        });
      }

      // Branch Admin cannot promote anyone to super_admin or branch_admin
      if (normalizedNewRole !== 'employee') {
        return res.status(403).json({
          message: 'Access denied: Branch Managers can only assign the Staff role'
        });
      }
    }

    // 5. If target user is super_admin and being demoted, prevent demoting the last Super Admin
    if (targetUser.role === 'super_admin' && normalizedNewRole !== 'super_admin') {
      const superAdminCount = await User.count({ where: { role: 'super_admin' } });
      if (superAdminCount <= 1) {
        return res.status(400).json({
          message: 'Cannot demote the last remaining Super Admin account'
        });
      }
    }

    // 6. Update user_roles and users.role transactionally
    await sequelize.transaction(async (t) => {
      // Clear existing user_roles for this user
      await UserRole.destroy({
        where: { user_id: targetUserId },
        transaction: t
      });

      // Insert new role association
      await UserRole.create({
        user_id: targetUserId,
        role_id: targetRoleRecord.id
      }, { transaction: t });

      // Synchronize users.role column
      targetUser.role = normalizedNewRole;
      await targetUser.save({ transaction: t });
    });

    // 7. Revoke active sessions for target user so permission changes take effect immediately
    try {
      const { invalidateAllUserSessionsCache } = require('../middleware/authMiddleware');
      if (typeof invalidateAllUserSessionsCache === 'function') {
        invalidateAllUserSessionsCache(targetUserId);
      }
      if (UserSession) {
        await UserSession.update(
          { is_active: false },
          { where: { user_id: targetUserId, is_active: true } }
        );
      }
    } catch (sErr) {
      console.warn('[AUTH] Role change session invalidation:', sErr.message);
    }

    // 8. Log audit trail
    await AuditLog.create({
      action: 'USER_ROLE_UPDATED',
      user_id: req.user.id,
      details: `User ${targetUser.username} (ID: ${targetUser.id}) role changed to ${normalizedNewRole} by ${req.user.username}`,
      ip_address: req.ip
    }).catch(e => console.warn('[AUTH] AuditLog error:', e.message));

    res.json({
      message: 'User role updated successfully',
      user: {
        id: targetUser.id,
        username: targetUser.username,
        first_name: targetUser.first_name,
        last_name: targetUser.last_name,
        role: targetUser.role,
        role_display: targetRoleRecord.display_name,
        branch_id: targetUser.branch_id
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);

    // 1. Prevent deleting self
    if (targetUserId === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 2. Server-side role boundaries for deletion
    if (req.user.role === 'branch_admin') {
      if (targetUser.role === 'super_admin') {
        return res.status(403).json({ message: 'Access denied: Cannot delete Super Admin accounts' });
      }
      if (targetUser.role === 'branch_admin') {
        return res.status(403).json({ message: 'Access denied: Cannot delete Branch Manager accounts' });
      }
      if (targetUser.branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: 'Access denied: Cannot delete users from other branches' });
      }
    }

    // 3. Prevent deleting the last Super Admin
    if (targetUser.role === 'super_admin') {
      const superAdminCount = await User.count({ where: { role: 'super_admin' } });
      if (superAdminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last remaining Super Admin account' });
      }
    }

    // 4. Invalidate sessions
    try {
      const { invalidateAllUserSessionsCache } = require('../middleware/authMiddleware');
      if (typeof invalidateAllUserSessionsCache === 'function') {
        invalidateAllUserSessionsCache(targetUserId);
      }
      if (UserSession) {
        await UserSession.update(
          { is_active: false },
          { where: { user_id: targetUserId } }
        );
      }
    } catch (sErr) {}

    // 5. Delete target user (cascades to user_roles due to foreign key ON DELETE CASCADE)
    await targetUser.destroy();

    // 6. Audit log
    await AuditLog.create({
      action: 'USER_ACCOUNT_TERMINATED',
      user_id: req.user.id,
      details: `User account ${targetUser.username} (ID: ${targetUserId}) terminated by ${req.user.username}`,
      ip_address: req.ip
    }).catch(e => console.warn('[AUTH] AuditLog error:', e.message));

    res.json({ message: 'User account terminated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  register,
  login,
  logout,
  getSession,
  getUsers,
  getRoles,
  updateUserRole,
  deleteUser,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyResetToken,
  resetPassword
};
