const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getAllTransfers,
  getTransferById,
  createTransfer,
  updateTransfer,
  completeTransferRoute,
  deleteTransferRoute
} = require('../controllers/transferController');

router.use(authenticateToken);
router.use(authorizeRoles('super_admin', 'branch_admin'));

router.get('/', getAllTransfers);

router.get('/:id', [
  param('id').isInt().withMessage('Invalid transfer ID.'),
  validate
], getTransferById);

router.post('/', [
  body('fromBranchId').isInt().withMessage('Source branch ID must be an integer.'),
  body('toBranchId').isInt().withMessage('Destination branch ID must be an integer.'),
  body('items').isArray({ min: 1 }).withMessage('Items array is required and cannot be empty.'),
  body('items.*.productId').isInt().withMessage('Product ID must be an integer.'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
  body('transferDate').optional({ checkFalsy: true }).isString().trim(),
  body('dispatchedBy').optional({ checkFalsy: true }).isString().trim(),
  body('notes').optional({ checkFalsy: true }).isString().trim(),
  body('autoReceive').optional().isBoolean(),
  validate
], createTransfer);

router.patch('/:id', [
  param('id').isInt().withMessage('Invalid transfer ID.'),
  body('transferDate').optional({ checkFalsy: true }).isString().trim(),
  body('dispatchedBy').optional({ checkFalsy: true }).isString().trim(),
  body('status').optional().isIn(['Pending', 'In-Transit', 'Completed']).withMessage('Status must be Pending, In-Transit, or Completed.'),
  body('notes').optional({ checkFalsy: true }).isString().trim(),
  validate
], updateTransfer);

router.put('/:id', [
  param('id').isInt().withMessage('Invalid transfer ID.'),
  validate
], updateTransfer);

router.post('/:id/complete', [
  param('id').isInt().withMessage('Invalid transfer ID.'),
  validate
], completeTransferRoute);

router.delete('/:id', [
  param('id').isInt().withMessage('Invalid transfer ID.'),
  validate
], deleteTransferRoute);

module.exports = router;
