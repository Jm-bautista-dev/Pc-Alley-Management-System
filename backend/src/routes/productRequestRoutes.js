const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const {
  createRequest,
  listRequests,
  getRequest,
  approveRequest,
  rejectRequest,
  scheduleRequest,
  completeRequest,
  cancelRequest
} = require('../controllers/productRequestController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/', [
  authorizeRoles('branch_admin'),
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array.'),
  body('items.*.product_id').isInt().withMessage('Product ID must be an integer.'),
  body('items.*.quantity_requested').isInt({ min: 1 }).withMessage('Quantity requested must be at least 1.'),
  body('notes').optional({ checkFalsy: true }).isString().trim(),
  body('priority').optional({ checkFalsy: true }).isIn(['low', 'normal', 'urgent']).withMessage('Invalid priority.'),
  validate
], createRequest);

router.get('/', [
  authorizeRoles('super_admin', 'branch_admin'),
  query('status').optional({ checkFalsy: true }).isIn(['Pending', 'Approved', 'Partially Approved', 'Rejected', 'Scheduled', 'In Transit', 'Completed', 'Cancelled']).withMessage('Invalid status.'),
  query('branch_id').optional({ checkFalsy: true }).isInt().withMessage('Branch ID must be an integer.'),
  query('from').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid from date.'),
  query('to').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid to date.'),
  validate
], listRequests);

router.get('/:id', [
  authorizeRoles('super_admin', 'branch_admin'),
  param('id').isInt().withMessage('Invalid ID.'),
  validate
], getRequest);

router.patch('/:id/approve', [
  authorizeRoles('super_admin'),
  param('id').isInt().withMessage('Invalid ID.'),
  body('quantity_approved').isInt({ min: 1 }).withMessage('Approved quantity must be at least 1.'),
  validate
], approveRequest);

router.patch('/:id/reject', [
  authorizeRoles('super_admin'),
  param('id').isInt().withMessage('Invalid ID.'),
  body('reason').notEmpty().trim().withMessage('Rejection reason is required.'),
  validate
], rejectRequest);

router.patch('/:id/schedule', [
  authorizeRoles('super_admin'),
  param('id').isInt().withMessage('Invalid ID.'),
  body('scheduled_date').isDate().withMessage('Invalid scheduled date.'),
  body('scheduled_time').notEmpty().trim().withMessage('Scheduled time is required.'),
  validate
], scheduleRequest);

router.patch('/:id/complete', [
  authorizeRoles('super_admin'),
  param('id').isInt().withMessage('Invalid ID.'),
  validate
], completeRequest);

router.patch('/:id/cancel', [
  authorizeRoles('branch_admin'),
  param('id').isInt().withMessage('Invalid ID.'),
  validate
], cancelRequest);

module.exports = router;
