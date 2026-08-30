const express = require('express');
const router = express.Router();
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
router.get('/:id', getServiceById);
router.post('/', authorizeRoles('super_admin', 'branch_admin'), createService);
router.put('/:id', authorizeRoles('super_admin', 'branch_admin'), updateService);
router.delete('/:id', authorizeRoles('super_admin', 'branch_admin'), deleteService);

// Service Jobs / Work Orders Routes
router.get('/jobs/list', getServiceJobs);
router.get('/jobs/:id', getServiceJobById);
router.post('/jobs', createServiceJob);
router.put('/jobs/:id/status', updateServiceJobStatus);

module.exports = router;
