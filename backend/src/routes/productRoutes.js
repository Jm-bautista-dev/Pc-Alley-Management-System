const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { getProducts, createProduct, createBundle, updateProduct } = require('../controllers/productController');
const { deleteProduct } = require('../controllers/inventoryController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', authenticateToken, getProducts);

router.post('/', [
  authenticateToken, 
  authorizeRoles('super_admin'), 
  upload.single('image'),
  body('name').notEmpty().trim().withMessage('Product name is required.'),
  body('price').isNumeric().withMessage('Price must be a number.'),
  body('description').optional({ checkFalsy: true }).isString().trim(),
  body('category_id').optional({ checkFalsy: true }).isInt().withMessage('Category ID must be an integer.'),
  body('supplier_id').optional({ checkFalsy: true }).isInt().withMessage('Supplier ID must be an integer.'),
  validate
], createProduct);

router.post('/bundles', [
  authenticateToken,
  body('name').notEmpty().trim().withMessage('Bundle name is required.'),
  body('price').isNumeric().withMessage('Price must be a number.'),
  body('category_id').optional({ checkFalsy: true }).isInt().withMessage('Category ID must be an integer.'),
  body('items').isArray({ min: 1 }).withMessage('Items array is required and cannot be empty.'),
  body('items.*.product_id').isInt().withMessage('Product ID must be an integer.'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
  validate
], createBundle);

router.patch('/:id', [
  authenticateToken, 
  authorizeRoles('super_admin', 'branch_admin'), 
  upload.single('image'),
  param('id').isInt().withMessage('Invalid product ID.'),
  body('name').optional().notEmpty().trim().withMessage('Product name cannot be empty.'),
  body('sku').optional().notEmpty().trim().withMessage('SKU cannot be empty.'),
  body('price').optional().isNumeric().withMessage('Price must be a number.'),
  body('description').optional({ checkFalsy: true }).isString().trim(),
  body('category_id').optional({ checkFalsy: true }).isInt().withMessage('Category ID must be an integer.'),
  validate
], updateProduct);

router.delete('/:id', [
  authenticateToken, 
  authorizeRoles('super_admin'),
  param('id').isInt().withMessage('Invalid product ID.'),
  validate
], deleteProduct);

module.exports = router;
