const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { register, login, getUsers } = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/register', [
  authenticateToken, 
  authorizeRoles('super_admin', 'branch_admin'),
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username or internal ID is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['branch_admin', 'employee']).withMessage('Invalid role designation'),
  body('branch_id')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Branch assignment must be a valid branch'),
  validate,
  register
]); 

router.post('/login', [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username or internal ID is required'),
  body('password').notEmpty().withMessage('Access key is required'),
  validate,
  login
]);

router.get('/users', authenticateToken, authorizeRoles('super_admin', 'branch_admin'), getUsers);

router.delete('/users/:id', authenticateToken, authorizeRoles('super_admin', 'branch_admin'), async (req, res) => {
  try {
    const { User } = require('../models');
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Branch admins can only delete users in their own branch
    if (req.user.role === 'branch_admin' && user.branch_id !== req.user.branch_id) {
      return res.status(403).json({ message: 'Access denied: Cannot delete users from other branches' });
    }

    // Prevent deleting self
    if (user.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await user.destroy();
    res.json({ message: 'User account terminated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
