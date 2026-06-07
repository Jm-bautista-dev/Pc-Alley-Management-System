const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getAllExpenses,
  createExpense,
  deleteExpense
} = require('../controllers/expenseController');

router.use(authenticateToken);

router.get('/', getAllExpenses);
router.post('/', createExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
