const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { getAllProducts, createProduct, updateStock, getInventory, getLowStock, getGlobalInventoryStatus, getProductRestockAnalytics, getStockHistory, deleteProduct, adjustStock, resyncProductsToBranches, repairImportedProducts } = require('../controllers/inventoryController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const upload = require('../middleware/uploadMiddleware');

router.get('/products', authenticateToken, getAllProducts);

router.post('/products', [
  authenticateToken, 
  authorizeRoles('super_admin', 'branch_admin'),
  upload.single('image'),
  body('name').trim().notEmpty().isLength({ min: 2, max: 200 }).withMessage('Product designation must be between 2 and 200 characters'),
  body('price').isFloat({ min: 0.01, max: 99999999.99 }).withMessage('Price must be a positive numerical value between ₱0.01 and ₱99,999,999.99'),
  validate,
  createProduct
]);

router.delete('/products/:id', authenticateToken, authorizeRoles('super_admin'), deleteProduct);

router.get('/', authenticateToken, authorizeRoles('super_admin', 'branch_admin', 'employee'), getInventory);

router.get('/low-stock', authenticateToken, authorizeRoles('super_admin', 'branch_admin', 'employee'), getLowStock);
router.get('/restock-analytics', authenticateToken, getProductRestockAnalytics);
router.get('/global-status', authenticateToken, authorizeRoles('super_admin', 'branch_admin'), getGlobalInventoryStatus);

router.patch('/stock', [
  authenticateToken, 
  authorizeRoles('super_admin', 'branch_admin'),
  body('product_id').notEmpty().withMessage('Product reference required'),
  body('branch_id').notEmpty().withMessage('Sector target required'),
  body('quantity').optional().isInt({ min: 0, max: 1000000 }).withMessage('Quantity must be between 0 and 1,000,000'),
  body('low_stock_threshold').optional().isInt({ min: 0, max: 100000 }).withMessage('Threshold must be between 0 and 100,000'),
  body('price').optional().custom(val => val === null || val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 99999999.99)).withMessage('Price must be a valid number between ₱0.00 and ₱99,999,999.99'),
  body('enabled').optional().isBoolean().withMessage('Enabled must be a boolean value'),
  validate,
  updateStock
]);

router.post('/adjust-stock', [
  authenticateToken,
  authorizeRoles('super_admin'),
  body('product_id').notEmpty().withMessage('Product ID is required'),
  body('branch_id').notEmpty().withMessage('Branch ID is required'),
  body('quantity').isInt({ min: -1000000, max: 1000000 }).withMessage('Quantity adjustment must be between -1,000,000 and 1,000,000'),
  validate,
  adjustStock
]);

// Legacy direct restock route removed in favor of approval workflow

// Resync products across all branches (Super Admin only)
router.post('/resync', authenticateToken, authorizeRoles('super_admin'), resyncProductsToBranches);

// Repair imported products: fix missing categories, brands, branch mappings, enabled states
router.post('/repair', authenticateToken, authorizeRoles('super_admin'), repairImportedProducts);

router.get('/:id/history', authenticateToken, authorizeRoles('super_admin', 'branch_admin', 'employee'), getStockHistory);

module.exports = router;
