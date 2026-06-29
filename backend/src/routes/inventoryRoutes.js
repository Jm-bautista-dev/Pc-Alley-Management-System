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
  body('name').notEmpty().withMessage('Product designation is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive numerical value'),
  validate,
  createProduct
]);

router.delete('/products/:id', authenticateToken, authorizeRoles('super_admin'), deleteProduct);

router.get('/', authenticateToken, authorizeRoles('super_admin', 'branch_admin', 'employee'), getInventory);

router.get('/low-stock', authenticateToken, authorizeRoles('super_admin', 'branch_admin', 'employee'), getLowStock);
router.get('/restock-analytics', authenticateToken, getProductRestockAnalytics);
router.get('/global-status', authenticateToken, authorizeRoles('super_admin'), getGlobalInventoryStatus);

router.patch('/stock', [
  authenticateToken, 
  authorizeRoles('super_admin', 'branch_admin'),
  body('product_id').notEmpty().withMessage('Product reference required'),
  body('branch_id').notEmpty().withMessage('Sector target required'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity cannot be negative'),
  body('low_stock_threshold').optional().isInt({ min: 0 }).withMessage('Threshold must be positive'),
  body('price').optional().custom(val => val === null || val === "" || !isNaN(parseFloat(val))).withMessage('Price must be a valid number'),
  body('enabled').optional().isBoolean().withMessage('Enabled must be a boolean value'),
  validate,
  updateStock
]);

router.post('/adjust-stock', [
  authenticateToken,
  authorizeRoles('super_admin'),
  body('product_id').notEmpty(),
  body('branch_id').notEmpty(),
  body('quantity').isInt(),
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
