const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { register, login, logout, getUsers, updateProfile, changePassword, forgotPassword, verifyResetToken, resetPassword } = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { loginRateLimiter } = require('../middleware/loginRateLimiter');

router.post('/register', [
  authenticateToken, 
  authorizeRoles('super_admin', 'branch_admin'),
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username or internal ID is required'),
  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
    .custom(val => !/\d/.test(val)).withMessage('First name cannot contain numbers')
    .matches(/^[A-Za-z\s.\'-]+$/).withMessage('First name can only contain letters, spaces, hyphens, apostrophes, and dots'),
  body('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
    .custom(val => !/\d/.test(val)).withMessage('Last name cannot contain numbers')
    .matches(/^[A-Za-z\s.\'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, apostrophes, and dots'),
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
  loginRateLimiter,
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username or internal ID is required'),
  body('password').notEmpty().withMessage('Access key is required'),
  validate,
  login
]);

router.post('/logout', authenticateToken, logout);

router.post('/forgot-password', [
  body('email').trim().notEmpty().withMessage('Email or username is required'),
  validate,
  forgotPassword
]);

router.post('/verify-reset-token', [
  body('email').trim().notEmpty().withMessage('Email or username is required'),
  body('token').trim().notEmpty().withMessage('Verification code is required'),
  validate,
  verifyResetToken
]);

router.post('/reset-password', [
  body('email').trim().notEmpty().withMessage('Email or username is required'),
  body('token').trim().notEmpty().withMessage('Verification code is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  validate,
  resetPassword
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

router.put('/profile', authenticateToken, [
  body('first_name')
    .optional()
    .trim()
    .notEmpty().withMessage('First name cannot be empty')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
    .custom(val => !/\d/.test(val)).withMessage('First name cannot contain numbers')
    .matches(/^[A-Za-z\s.\'-]+$/).withMessage('First name can only contain letters, spaces, hyphens, apostrophes, and dots'),
  body('last_name')
    .optional()
    .trim()
    .notEmpty().withMessage('Last name cannot be empty')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
    .custom(val => !/\d/.test(val)).withMessage('Last name cannot contain numbers')
    .matches(/^[A-Za-z\s.\'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, apostrophes, and dots'),
  validate
], updateProfile);

router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  validate
], changePassword);

module.exports = router;
