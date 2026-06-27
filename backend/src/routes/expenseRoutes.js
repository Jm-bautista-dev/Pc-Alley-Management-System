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
  body('category').notEmpty().trim().withMessage('Category is required.'),
  body('amount').isNumeric().withMessage('Amount must be a number.').custom(value => value > 0).withMessage('Amount must be greater than 0.'),
  body('notes').optional({ checkFalsy: true }).isString().trim(),
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
