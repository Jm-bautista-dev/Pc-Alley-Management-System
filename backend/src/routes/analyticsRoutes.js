const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getDashboardMetrics,
  getBranchPerformance,
  getRevenueForecast,
  getBestSellers,
  getDeadStock,
  getCrossSellInsights,
  getCustomerAnalytics,
  getForecastingAnalytics,
  getPrescriptiveAnalytics,
  getBrandAnalytics
} = require('../controllers/analyticsController');

router.use(authenticateToken);

router.get('/dashboard', getDashboardMetrics);
router.get('/branch-performance', getBranchPerformance);
router.get('/forecast', getRevenueForecast);
router.get('/best-sellers', getBestSellers);
router.get('/dead-stock', getDeadStock);
router.get('/cross-sell', getCrossSellInsights);
router.get('/customers', getCustomerAnalytics);
router.get('/brands', getBrandAnalytics);

// Refactored Super Admin restricted analytics routes
router.get('/forecasting', authorizeRoles('super_admin'), getForecastingAnalytics);
router.get('/prescriptive', authorizeRoles('super_admin'), getPrescriptiveAnalytics);

module.exports = router;
