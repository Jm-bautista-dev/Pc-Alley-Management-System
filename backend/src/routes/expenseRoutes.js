const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getAllExpenses,
  createExpense,
  deleteExpense
} = require('../controllers/expenseController');

router.use(authenticateToken);

router.get('/', getAllExpenses);

router.post('/', [
  body('category').trim().notEmpty().withMessage('Category is required.').isLength({ min: 2, max: 100 }).withMessage('Category must be between 2 and 100 characters.'),
  body('amount').isFloat({ min: 0.01, max: 10000000 }).withMessage('Amount must be between ₱0.01 and ₱10,000,000.00.'),
  body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters.'),
  body('receiptUrl').optional({ checkFalsy: true }).isString().trim(),
  body('expenseDate').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid date format.'),
  body('branchId').optional({ checkFalsy: true }).isInt().withMessage('Branch ID must be an integer.'),
  validate
], createExpense);

router.delete('/:id', [
  param('id').isInt().withMessage('Invalid expense ID.'),
  validate
], deleteExpense);

module.exports = router;
