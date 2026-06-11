const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getDashboardMetrics,
  getBranchPerformance,
  getRevenueForecast,
  getBestSellers,
  getDeadStock,
  getCrossSellInsights,
  getCustomerAnalytics
} = require('../controllers/analyticsController');

router.use(authenticateToken);

router.get('/dashboard', getDashboardMetrics);
router.get('/branch-performance', getBranchPerformance);
router.get('/forecast', getRevenueForecast);
router.get('/best-sellers', getBestSellers);
router.get('/dead-stock', getDeadStock);
router.get('/cross-sell', getCrossSellInsights);
router.get('/customers', getCustomerAnalytics);

module.exports = router;
