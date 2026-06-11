const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Branch } = require('../models');

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
    const fullName = String(req.body.full_name || '').trim();

    if (!username) {
      return res.status(400).json({ message: 'Username or internal ID is required' });
    }

    if (!fullName) {
      return res.status(400).json({ message: 'Full name is required' });
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
      full_name: fullName,
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
      return res.status(401).json({ message: 'Incorrect Username or Password' });
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
      return res.status(401).json({ message: 'Incorrect Username or Password' });
    }

    console.log(`[AUTH] User successfully authenticated: ${username} (Role: ${user.role})`);

    if (!process.env.JWT_SECRET) {
      console.error('[AUTH] FATAL ERROR: JWT_SECRET is not defined in environment variables.');
      throw new Error('Server identity check failed. Please contact administrator.');
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        full_name: user.full_name,
        username: user.username, 
        role: user.role, 
        branch_id: user.branch_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.Branch ? user.Branch.name : 'All'
      }
    });
  } catch (error) {
    console.error(`[AUTH] Critical server error during login: ${error.message}`, error);
    res.status(500).json({ 
      error: error.message,
      message: `System Error: ${error.message}` 
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', branch_id } = req.query;
    const pagination = require('../utils/pagination');
    const { offset, where, order } = pagination({ page, limit, search, searchableFields: ['username', 'full_name'] });
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
      limit: Number(limit),
      order
    });
    res.json({
      data: rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { register, login, getUsers };
