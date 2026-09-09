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
  processRequest,
  scheduleRequest,
  fulfillRequest,
  completeRequest,
  cancelRequest,
  getRequestAudit
} = require('../controllers/productRequestController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// 1. Create Stock Request (Admin or Staff)
router.post('/', [
  authorizeRoles('super_admin', 'branch_admin', 'employee'),
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array.'),
  body('items.*.product_id').isInt().withMessage('Product ID must be an integer.'),
  body('items.*.quantity_requested').isInt({ min: 1, max: 1000000 }).withMessage('Quantity requested must be between 1 and 1,000,000.'),
  body('source_branch_id').optional({ nullable: true }).isInt().withMessage('Source branch ID must be an integer.'),
  body('notes').optional({ checkFalsy: true }).isString().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters.'),
  body('priority').optional({ checkFalsy: true }).isIn(['low', 'normal', 'urgent']).withMessage('Invalid priority.'),
  validate
], createRequest);

// 2. List Stock Requests (Scoped by role)
router.get('/', [
  authorizeRoles('super_admin', 'branch_admin', 'employee'),
  query('status').optional({ checkFalsy: true }).isString().withMessage('Invalid status format.'),
  query('branch_id').optional({ checkFalsy: true }).isInt().withMessage('Branch ID must be an integer.'),
  query('source_branch_id').optional({ checkFalsy: true }).isInt().withMessage('Source branch ID must be an integer.'),
  query('from').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid from date.'),
  query('to').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid to date.'),
  query('priority').optional({ checkFalsy: true }).isIn(['low', 'normal', 'urgent']).withMessage('Invalid priority.'),
  query('search').optional({ checkFalsy: true }).isString().trim(),
  query('my_only').optional().isBoolean(),
  validate
], listRequests);

// 3. Get Single Stock Request Details
router.get('/:id', [
  authorizeRoles('super_admin', 'branch_admin', 'employee'),
  param('id').isInt().withMessage('Invalid ID.'),
  validate
], getRequest);

// 4. Get Audit Trail / History for Request
router.get('/:id/audit', [
  authorizeRoles('super_admin', 'branch_admin', 'employee'),
  param('id').isInt().withMessage('Invalid ID.'),
  validate
], getRequestAudit);

// 5. Approve Stock Request (SUPER ADMIN ONLY)
router.patch('/:id/approve', [
  authorizeRoles('super_admin'),
  param('id').isInt().withMessage('Invalid ID.'),
  body('quantity_approved').isInt({ min: 1, max: 1000000 }).withMessage('Approved quantity must be between 1 and 1,000,000.'),
  body('approval_notes').optional({ checkFalsy: true }).isString().trim().isLength({ max: 500 }).withMessage('Approval notes cannot exceed 500 characters.'),
  validate
], approveRequest);

// 6. Reject Stock Request (SUPER ADMIN ONLY)
router.patch('/:id/reject', [
  authorizeRoles('super_admin'),
  param('id').isInt().withMessage('Invalid ID.'),
  body('reason').notEmpty().trim().isLength({ min: 1, max: 500 }).withMessage('Rejection reason must be between 1 and 500 characters.'),
  validate
], rejectRequest);

// 7. Process Request (SUPER ADMIN ONLY)
router.patch('/:id/process', [
  authorizeRoles('super_admin'),
  param('id').isInt().withMessage('Invalid ID.'),
  validate
], processRequest);

// 8. Schedule Delivery (SUPER ADMIN ONLY)
router.patch('/:id/schedule', [
  authorizeRoles('super_admin'),
  param('id').isInt().withMessage('Invalid ID.'),
  body('scheduled_date').isDate().withMessage('Invalid scheduled date.'),
  body('scheduled_time').notEmpty().trim().withMessage('Scheduled time is required.'),
  validate
], scheduleRequest);

// 9. Fulfill Stock Request (SUPER ADMIN ONLY)
router.patch('/:id/fulfill', [
  authorizeRoles('super_admin'),
  param('id').isInt().withMessage('Invalid ID.'),
  validate
], fulfillRequest);

// 9b. Complete Request (Backward-compatible alias for fulfill)
router.patch('/:id/complete', [
  authorizeRoles('super_admin'),
  param('id').isInt().withMessage('Invalid ID.'),
  validate
], completeRequest);

// 10. Cancel Pending Request (Requester or Authorized Branch Admin)
router.patch('/:id/cancel', [
  authorizeRoles('super_admin', 'branch_admin', 'employee'),
  param('id').isInt().withMessage('Invalid ID.'),
  validate
], cancelRequest);

module.exports = router;
