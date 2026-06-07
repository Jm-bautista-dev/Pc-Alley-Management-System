const express = require('express');
const router = express.Router();
const { getProducts, createProduct, createBundle, updateProduct } = require('../controllers/productController');
const { deleteProduct } = require('../controllers/inventoryController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', authenticateToken, getProducts);
router.post('/', authenticateToken, authorizeRoles('super_admin'), upload.single('image'), createProduct);
router.post('/bundles', authenticateToken, createBundle);
router.patch('/:id', authenticateToken, authorizeRoles('super_admin'), upload.single('image'), updateProduct);
router.delete('/:id', authenticateToken, authorizeRoles('super_admin'), deleteProduct);

module.exports = router;
