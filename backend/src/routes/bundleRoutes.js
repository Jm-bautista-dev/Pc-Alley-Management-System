const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  getBundles,
  getBundleById,
  createBundle,
  updateBundle,
  deleteBundle
} = require('../controllers/bundleController');

// Parse JSON fields when request is sent via multipart/form-data
const parseMultipartJsonFields = (req, res, next) => {
  if (req.body) {
    if (typeof req.body.items === 'string') {
      try {
        req.body.items = JSON.parse(req.body.items);
      } catch (e) {}
    }
    if (typeof req.body.branch_ids === 'string') {
      try {
        req.body.branch_ids = JSON.parse(req.body.branch_ids);
      } catch (e) {}
    }
  }
  next();
};

// All bundle endpoints require authentication
router.use(authenticateToken);

// GET /api/bundles - Accessible by Super Admin, Branch Admin, and Staff (branch-scoped)
router.get('/', getBundles);

// GET /api/bundles/:id - Single bundle details
router.get('/:id', [
  param('id').isInt().withMessage('Invalid bundle ID.'),
  validate
], getBundleById);

// POST /api/bundles - Super Admin only
router.post('/', [
  authorizeRoles('super_admin'),
  upload.single('image'),
  parseMultipartJsonFields,
  body('name')
    .trim()
    .notEmpty().withMessage('Bundle name is required.')
    .isLength({ min: 2, max: 200 }).withMessage('Bundle name must be between 2 and 200 characters.'),
  body('price')
    .optional()
    .isFloat({ min: 0, max: 99999999.99 }).withMessage('Bundle price must be a valid non-negative number.'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters.'),
  body('items')
    .isArray({ min: 1 }).withMessage('At least one product must be included in the bundle.'),
  body('items.*.product_id')
    .isInt().withMessage('Each item must specify a valid product ID.'),
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1, max: 100000 }).withMessage('Item quantity must be at least 1.'),
  body('branch_ids')
    .isArray({ min: 1 }).withMessage('At least one branch must be selected for the bundle.'),
  body('branch_ids.*')
    .isInt().withMessage('Each branch ID must be an integer.'),
  validate
], createBundle);

// PUT /api/bundles/:id - Super Admin only
router.put('/:id', [
  authorizeRoles('super_admin'),
  upload.single('image'),
  parseMultipartJsonFields,
  param('id').isInt().withMessage('Invalid bundle ID.'),
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Bundle name cannot be empty.')
    .isLength({ min: 2, max: 200 }).withMessage('Bundle name must be between 2 and 200 characters.'),
  body('price')
    .optional()
    .isFloat({ min: 0, max: 99999999.99 }).withMessage('Bundle price must be a valid non-negative number.'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters.'),
  body('items')
    .optional()
    .isArray({ min: 1 }).withMessage('Items must be an array with at least one product.'),
  body('items.*.product_id')
    .optional()
    .isInt().withMessage('Each item must specify a valid product ID.'),
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1, max: 100000 }).withMessage('Item quantity must be at least 1.'),
  body('branch_ids')
    .optional()
    .isArray({ min: 1 }).withMessage('Branch IDs must be an array with at least one branch.'),
  body('branch_ids.*')
    .optional()
    .isInt().withMessage('Each branch ID must be an integer.'),
  validate
], updateBundle);

// DELETE /api/bundles/:id - Super Admin only
router.delete('/:id', [
  authorizeRoles('super_admin'),
  param('id').isInt().withMessage('Invalid bundle ID.'),
  validate
], deleteBundle);

module.exports = router;
