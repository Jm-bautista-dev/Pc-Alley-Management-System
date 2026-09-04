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
  body('customer_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Customer name must be between 2 and 100 characters.')
    .custom(val => !/\d/.test(val)).withMessage('Customer name cannot contain numbers.')
    .matches(/^[A-Za-z\s.\'-]+$/).withMessage('Customer name can only contain letters, spaces, hyphens, apostrophes, and dots.'),
  body('customer_id').optional({ checkFalsy: true }).isUUID().withMessage('Invalid customer ID'),
  body('branch_id')
    .if((value, { req }) => req.user?.role === 'super_admin')
    .notEmpty().withMessage('branch_id is required for checkout')
    .isInt({ min: 1 }).withMessage('branch_id must be a valid integer ID'),
  body('items')
    .customSanitizer(value => {
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch (e) { return []; }
      }
      return value;
    })
    .isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product_id')
    .if((value, { req, path }) => {
      const match = path.match(/items\[(\d+)\]/);
      const index = match ? parseInt(match[1], 10) : null;
      const item = index !== null && req.body.items ? req.body.items[index] : null;
      return !(item?.item_type === 'service' || item?.service_id);
    })
    .notEmpty().withMessage('product_id is required'),
  body('items.*.quantity').isInt({ min: 1, max: 100000 }).withMessage('quantity must be between 1 and 100,000'),
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
