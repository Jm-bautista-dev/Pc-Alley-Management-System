const express = require('express');
const router = express.Router();
const { Category } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Get all categories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new category
router.post('/', [authenticateToken, authorizeRoles('super_admin')], async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const category = await Category.create({ name });
    res.status(201).json(category);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Category name already exists.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete category
router.delete('/:id', [authenticateToken, authorizeRoles('super_admin')], async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    await category.destroy();
    res.json({ message: 'Category deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
