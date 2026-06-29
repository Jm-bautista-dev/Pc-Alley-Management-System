const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const {
  createSale,
  getSalesHistory,
  getComparativeSales,
  getSalesTrends,
  getDailyTrends,
  getProductPerformance
} = require('../controllers/salesController');
const { authenticateToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// POST /api/sales — create a completed sale
router.post('/', [
  authenticateToken,
  upload.single('proof_of_payment'),
  body('customer_name').optional().trim(),
  body('customer_id').optional({ checkFalsy: true }).isUUID().withMessage('Invalid customer ID'),
  body('items')
    .customSanitizer(value => {
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch (e) { return []; }
      }
      return value;
    })
    .isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product_id').notEmpty().withMessage('product_id is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('quantity must be at least 1'),
  body('payment_method')
    .isIn(['cash', 'card', 'transfer', 'gcash', 'bank_transfer', 'mixed'])
    .withMessage('Invalid payment method'),
  validate,
  createSale
]);

router.get('/history',      authenticateToken, getSalesHistory);
router.get('/comparative',  authenticateToken, getComparativeSales);
router.get('/trends',       authenticateToken, getSalesTrends);
router.get('/daily-trends', authenticateToken, getDailyTrends);
router.get('/performance',  authenticateToken, getProductPerformance);

module.exports = router;
