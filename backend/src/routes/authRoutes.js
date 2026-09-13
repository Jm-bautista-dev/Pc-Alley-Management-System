const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const {
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
} = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { loginRateLimiter } = require('../middleware/loginRateLimiter');

const resilientLogoutAuth = (req, res, next) => {
  authenticateToken(req, res, () => {
    next();
  });
};

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
  body('role').isIn(['super_admin', 'branch_admin', 'employee']).withMessage('Invalid role designation'),
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

router.post('/logout', resilientLogoutAuth, logout);
router.get('/session', authenticateToken, getSession);

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

router.get('/roles', authenticateToken, getRoles);
router.get('/users', authenticateToken, authorizeRoles('super_admin', 'branch_admin'), getUsers);
router.put('/users/:id/role', [
  authenticateToken,
  authorizeRoles('super_admin', 'branch_admin'),
  body('role').trim().isIn(['super_admin', 'branch_admin', 'employee']).withMessage('Invalid role designation'),
  validate
], updateUserRole);
router.delete('/users/:id', authenticateToken, authorizeRoles('super_admin', 'branch_admin'), deleteUser);

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
