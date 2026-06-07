const express = require('express');
const router  = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getAllCustomers,
  getCustomerById,
  getCustomerHistory,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers
} = require('../controllers/customerController');

router.use(authenticateToken);

router.get('/search',       searchCustomers);    // GET /api/customers/search?q=John
router.get('/',             getAllCustomers);
router.get('/:id',          getCustomerById);
router.get('/:id/history',  getCustomerHistory); // GET /api/customers/:id/history
router.post('/',            createCustomer);
router.put('/:id',          updateCustomer);
router.delete('/:id',       deleteCustomer);

module.exports = router;
