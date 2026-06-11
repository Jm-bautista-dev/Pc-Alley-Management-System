const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { createRequest, listRequests, approveRequest, rejectRequest } = require('../controllers/restockController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/', [
  authorizeRoles('super_admin', 'branch_admin', 'employee'),
  body('product_id').isInt().withMessage('Product ID must be an integer.'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
  body('cost_price').optional({ checkFalsy: true }).isNumeric().withMessage('Cost price must be a number.'),
  body('supplier_id').optional({ checkFalsy: true }).isInt().withMessage('Supplier ID must be an integer.'),
  body('branch_id').optional({ checkFalsy: true }).isInt().withMessage('Branch ID must be an integer.'),
  body('notes').optional({ checkFalsy: true }).isString().trim(),
  validate
], createRequest);

router.get('/', [
  authorizeRoles('super_admin', 'branch_admin', 'employee'),
  query('status').optional({ checkFalsy: true }).isIn(['Pending', 'Approved', 'Rejected']).withMessage('Invalid status.'),
  query('branch_id').optional({ checkFalsy: true }).isInt().withMessage('Branch ID must be an integer.'),
  query('from').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid from date.'),
  query('to').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid to date.'),
  validate
], listRequests);

router.patch('/:id/approve', [
  authorizeRoles('super_admin', 'branch_admin'),
  param('id').isInt().withMessage('Invalid request ID.'),
  validate
], approveRequest);

router.patch('/:id/reject', [
  authorizeRoles('super_admin', 'branch_admin'),
  param('id').isInt().withMessage('Invalid request ID.'),
  body('reason').notEmpty().trim().withMessage('Rejection reason is required.'),
  validate
], rejectRequest);

module.exports = router;
