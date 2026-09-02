const express = require('express');
const router  = express.Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getAllCustomers,
  getCustomerById,
  getCustomerHistory,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers
} = require('../controllers/customerController');

router.use(authenticateToken);

router.get('/search', [
  query('q').isString().trim().isLength({ min: 2 }).withMessage('Search query must be at least 2 characters long.'),
  validate
], searchCustomers);

router.get('/', getAllCustomers);

router.get('/:id', [
  param('id').isUUID().withMessage('Invalid customer ID.'),
  validate
], getCustomerById);

router.get('/:id/history', [
  param('id').isUUID().withMessage('Invalid customer ID.'),
  validate
], getCustomerHistory);

router.post('/', [
  body('name')
    .trim()
    .notEmpty().withMessage('Customer name is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Customer name must be between 2 and 100 characters.')
    .custom(val => !/\d/.test(val)).withMessage('Customer name cannot contain numbers.')
    .matches(/^[A-Za-z\s.\'-]+$/).withMessage('Customer name can only contain letters, spaces, hyphens, apostrophes, and dots.'),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Valid email is required.')
    .isLength({ max: 100 }).withMessage('Email cannot exceed 100 characters.'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^09\d{9}$/).withMessage('Phone number must start with 09 and contain exactly 11 digits.')
    .custom(val => !/^(.)\1+$/.test(val)).withMessage('Phone number cannot consist of only repeating identical digits.'),
  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 }).withMessage('Address cannot exceed 255 characters.'),
  body('branchId')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('Branch ID must be an integer.'),
  validate
], createCustomer);

router.put('/:id', [
  param('id').isUUID().withMessage('Invalid customer ID.'),
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Customer name cannot be empty.')
    .isLength({ min: 2, max: 100 }).withMessage('Customer name must be between 2 and 100 characters.')
    .custom(val => !/\d/.test(val)).withMessage('Customer name cannot contain numbers.')
    .matches(/^[A-Za-z\s.\'-]+$/).withMessage('Customer name can only contain letters, spaces, hyphens, apostrophes, and dots.'),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Valid email is required.')
    .isLength({ max: 100 }).withMessage('Email cannot exceed 100 characters.'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^09\d{9}$/).withMessage('Phone number must start with 09 and contain exactly 11 digits.')
    .custom(val => !/^(.)\1+$/.test(val)).withMessage('Phone number cannot consist of only repeating identical digits.'),
  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 }).withMessage('Address cannot exceed 255 characters.'),
  body('branchId')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('Branch ID must be an integer.'),
  validate
], updateCustomer);

router.delete('/:id', [
  param('id').isUUID().withMessage('Invalid customer ID.'),
  validate
], deleteCustomer);

module.exports = router;
