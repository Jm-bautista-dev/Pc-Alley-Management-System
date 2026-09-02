const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { getProducts, createProduct, createBundle, updateProduct, bulkImportProducts, undoBulkImport } = require('../controllers/productController');
const { deleteProduct } = require('../controllers/inventoryController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', authenticateToken, getProducts);

router.post('/', [
  authenticateToken, 
  authorizeRoles('super_admin'), 
  upload.single('image'),
  body('name')
    .notEmpty().trim()
    .isLength({ min: 2, max: 200 }).withMessage('Product name must be between 2 and 200 characters.')
    .matches(/[A-Za-z]/).withMessage('Product name must contain letters or a valid model designation (cannot be numbers only).'),
  body('price').isFloat({ min: 0.01, max: 99999999.99 }).withMessage('Price must be a positive number between ₱0.01 and ₱99,999,999.99.'),
  body('description').optional({ checkFalsy: true }).isString().trim().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters.'),
  body('category_id').optional({ checkFalsy: true }).isInt().withMessage('Category ID must be an integer.'),
  body('supplier_id').optional({ checkFalsy: true }).isInt().withMessage('Supplier ID must be an integer.'),
  validate
], createProduct);

router.post('/bundles', [
  authenticateToken,
  body('name').notEmpty().trim().isLength({ min: 2, max: 200 }).withMessage('Bundle name must be between 2 and 200 characters.'),
  body('price').isFloat({ min: 0.01, max: 99999999.99 }).withMessage('Price must be a positive number between ₱0.01 and ₱99,999,999.99.'),
  body('category_id').optional({ checkFalsy: true }).isInt().withMessage('Category ID must be an integer.'),
  body('items').isArray({ min: 1 }).withMessage('Items array is required and cannot be empty.'),
  body('items.*.product_id').isInt().withMessage('Product ID must be an integer.'),
  body('items.*.quantity').isInt({ min: 1, max: 100000 }).withMessage('Quantity must be between 1 and 100,000.'),
  validate
], createBundle);

router.patch('/:id', [
  authenticateToken, 
  authorizeRoles('super_admin', 'branch_admin'), 
  upload.single('image'),
  param('id').isInt().withMessage('Invalid product ID.'),
  body('name').optional().notEmpty().trim().isLength({ min: 2, max: 200 }).withMessage('Product name must be between 2 and 200 characters.'),
  body('sku').optional().notEmpty().trim().isLength({ min: 2, max: 100 }).withMessage('SKU must be between 2 and 100 characters.'),
  body('price').optional().isFloat({ min: 0.01, max: 99999999.99 }).withMessage('Price must be a positive number between ₱0.01 and ₱99,999,999.99.'),
  body('description').optional({ checkFalsy: true }).isString().trim().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters.'),
  body('category_id').optional({ checkFalsy: true }).isInt().withMessage('Category ID must be an integer.'),
  validate
], updateProduct);

router.delete('/:id', [
  authenticateToken, 
  authorizeRoles('super_admin'),
  param('id').isInt().withMessage('Invalid product ID.'),
  validate
], deleteProduct);

router.post('/import', [
  authenticateToken,
  authorizeRoles('super_admin')
], bulkImportProducts);

router.post('/import/undo', [
  authenticateToken,
  authorizeRoles('super_admin')
], undoBulkImport);

module.exports = router;
