const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getAllTransfers,
  getTransferById,
  createTransfer,
  dispatchTransferRoute,
  completeTransferRoute,
  getTransmittalRoute
} = require('../controllers/transferController');

router.use(authenticateToken);

router.get('/', getAllTransfers);

router.get('/:id', [
  param('id').isInt().withMessage('Invalid transfer ID.'),
  validate
], getTransferById);

router.get('/:id/transmittal', [
  param('id').isInt().withMessage('Invalid transfer ID.'),
  validate
], getTransmittalRoute);

router.post('/', [
  body('fromBranchId').isInt().withMessage('Source branch ID must be an integer.'),
  body('toBranchId').isInt().withMessage('Destination branch ID must be an integer.'),
  body('items').isArray({ min: 1 }).withMessage('Items array is required and cannot be empty.'),
  body('items.*.productId').isInt().withMessage('Product ID must be an integer.'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
  body('notes').optional({ checkFalsy: true }).isString().trim(),
  validate
], createTransfer);

router.post('/:id/dispatch', [
  param('id').isInt().withMessage('Invalid transfer ID.'),
  validate
], dispatchTransferRoute);

router.post('/:id/complete', [
  param('id').isInt().withMessage('Invalid transfer ID.'),
  validate
], completeTransferRoute);

router.post('/:id/receive', [
  param('id').isInt().withMessage('Invalid transfer ID.'),
  validate
], completeTransferRoute);

module.exports = router;
