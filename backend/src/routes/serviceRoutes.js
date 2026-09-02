const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServiceCategories,
  getServiceJobs,
  getServiceJobById,
  createServiceJob,
  updateServiceJobStatus
} = require('../controllers/serviceController');

router.use(authenticateToken);

// Service Categories
router.get('/categories', getServiceCategories);

// Service Catalog Routes
router.get('/', getServices);
router.get('/:id', [
  param('id').isInt().withMessage('Invalid service ID.'),
  validate
], getServiceById);

router.post('/', [
  authorizeRoles('super_admin', 'branch_admin'),
  body('name')
    .trim()
    .notEmpty().withMessage('Service name is required.')
    .isLength({ min: 2, max: 150 }).withMessage('Service name must be between 2 and 150 characters.'),
  body('base_price')
    .notEmpty().withMessage('Base price is required.')
    .isFloat({ min: 0, max: 1000000 }).withMessage('Base price must be between ₱0.00 and ₱1,000,000.00.'),
  body('category')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Category cannot exceed 100 characters.'),
  body('pricing_type')
    .optional({ checkFalsy: true })
    .isIn(['fixed', 'hourly', 'quote', 'tiered']).withMessage('Invalid pricing type designation.'),
  body('estimated_duration_mins')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 10080 }).withMessage('Estimated duration must be between 1 and 10080 minutes.'),
  validate
], createService);

router.put('/:id', [
  authorizeRoles('super_admin', 'branch_admin'),
  param('id').isInt().withMessage('Invalid service ID.'),
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Service name cannot be empty.')
    .isLength({ min: 2, max: 150 }).withMessage('Service name must be between 2 and 150 characters.'),
  body('base_price')
    .optional()
    .isFloat({ min: 0, max: 1000000 }).withMessage('Base price must be between ₱0.00 and ₱1,000,000.00.'),
  body('pricing_type')
    .optional()
    .isIn(['fixed', 'hourly', 'quote', 'tiered']).withMessage('Invalid pricing type designation.'),
  validate
], updateService);

router.delete('/:id', [
  authorizeRoles('super_admin', 'branch_admin'),
  param('id').isInt().withMessage('Invalid service ID.'),
  validate
], deleteService);

// Service Jobs / Work Orders Routes
router.get('/jobs/list', getServiceJobs);
router.get('/jobs/:id', [
  param('id').isInt().withMessage('Invalid service job ID.'),
  validate
], getServiceJobById);

router.post('/jobs', [
  body('customer_name')
    .trim()
    .notEmpty().withMessage('Customer name is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Customer name must be between 2 and 100 characters.')
    .custom(val => !/\d/.test(val)).withMessage('Customer name cannot contain numbers.')
    .matches(/^[A-Za-z\s.\'-]+$/).withMessage('Customer name can only contain letters, spaces, hyphens, apostrophes, and dots.'),
  body('customer_phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^09\d{9}$/).withMessage('Phone number must start with 09 and contain exactly 11 digits.')
    .custom(val => !/^(.)\1+$/.test(val)).withMessage('Phone number cannot consist of only repeating identical digits.'),
  body('service_id')
    .notEmpty().withMessage('Technical service is required.')
    .isInt({ min: 1 }).withMessage('Valid service ID is required.'),
  body('estimated_price')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 1000000 }).withMessage('Estimated price must be between ₱0.00 and ₱1,000,000.00.'),
  body('device_type')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Device type cannot exceed 100 characters.'),
  body('device_specs')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Hardware specs cannot exceed 500 characters.'),
  body('serial_number')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Serial number cannot exceed 100 characters.'),
  body('reported_issue')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Reported issue cannot exceed 1000 characters.'),
  validate
], createServiceJob);

router.put('/jobs/:id/status', [
  param('id').isInt().withMessage('Invalid service job ID.'),
  body('status')
    .optional()
    .isIn(['received', 'diagnosing', 'waiting_for_approval', 'in_progress', 'ready_for_release', 'completed', 'cancelled'])
    .withMessage('Invalid workflow status.'),
  body('final_price')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 1000000 }).withMessage('Final price must be between ₱0.00 and ₱1,000,000.00.'),
  body('price_override_reason')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Price override reason cannot exceed 500 characters.'),
  body('diagnosis')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Diagnosis cannot exceed 1000 characters.'),
  validate
], updateServiceJobStatus);

module.exports = router;

