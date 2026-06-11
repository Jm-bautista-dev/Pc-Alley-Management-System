const { Expense, Branch, User } = require('../models');

const getAllExpenses = async (req, res) => {
  try {
    const branchId = req.user.role !== 'super_admin' ? req.user.branch_id : req.query.branchId;
    const where = {};
    if (branchId) where.branchId = branchId;

    const expenses = await Expense.findAll({
      where,
      include: [
        { model: Branch, attributes: ['name'] },
        { model: User, attributes: ['username'] }
      ],
      order: [['expenseDate', 'DESC']]
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createExpense = async (req, res) => {
  try {
    const { category, amount, notes, receiptUrl, expenseDate, branchId } = req.body;
    
    // Resolve sector authorization
    const resolvedBranchId = req.user.role !== 'super_admin' ? req.user.branch_id : (branchId || 1);

    const expense = await Expense.create({
      branchId: resolvedBranchId,
      userId: req.user.id,
      category,
      amount,
      notes,
      receiptUrl: receiptUrl || null,
      expenseDate: expenseDate || new Date()
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense log not found.' });

    // Validate sector authorization
    if (req.user.role === 'branch_admin' && expense.branchId !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You cannot modify logs outside your sector.' });
    }

    await expense.destroy();
    res.json({ message: 'Expense log removed.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllExpenses,
  createExpense,
  deleteExpense
};
