const express = require('express');
const router = express.Router();
const { AuditLog, User } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      include: [{ model: User, attributes: ['username'] }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
