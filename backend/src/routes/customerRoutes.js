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
  body('name').notEmpty().trim().withMessage('Name is required.'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required.'),
  body('phone').optional({ checkFalsy: true }).isString().trim(),
  body('address').optional({ checkFalsy: true }).isString().trim(),
  body('branchId').optional({ checkFalsy: true }).isInt().withMessage('Branch ID must be an integer.'),
  validate
], createCustomer);

router.put('/:id', [
  param('id').isUUID().withMessage('Invalid customer ID.'),
  body('name').optional().notEmpty().trim().withMessage('Name cannot be empty.'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required.'),
  body('phone').optional({ checkFalsy: true }).isString().trim(),
  body('address').optional({ checkFalsy: true }).isString().trim(),
  body('branchId').optional({ checkFalsy: true }).isInt().withMessage('Branch ID must be an integer.'),
  validate
], updateCustomer);

router.delete('/:id', [
  param('id').isUUID().withMessage('Invalid customer ID.'),
  validate
], deleteCustomer);

module.exports = router;
