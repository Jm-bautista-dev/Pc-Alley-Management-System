const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  receivePurchaseOrderRoute
} = require('../controllers/purchaseController');

router.use(authenticateToken);

router.get('/', getAllPurchaseOrders);

router.get('/:id', [
  param('id').isInt().withMessage('Invalid purchase order ID.'),
  validate
], getPurchaseOrderById);

router.post('/', [
  body('supplierId').isInt().withMessage('Supplier ID must be an integer.'),
  body('branchId').optional({ checkFalsy: true }).isInt().withMessage('Branch ID must be an integer.'),
  body('items').isArray({ min: 1 }).withMessage('Items array is required and cannot be empty.'),
  body('items.*.productId').isInt().withMessage('Product ID must be an integer.'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
  body('items.*.unitCost').isNumeric().withMessage('Unit cost must be a number.').custom(value => value >= 0).withMessage('Unit cost cannot be negative.'),
  validate
], createPurchaseOrder);

router.post('/:id/receive', [
  param('id').isInt().withMessage('Invalid purchase order ID.'),
  validate
], receivePurchaseOrderRoute);

module.exports = router;
