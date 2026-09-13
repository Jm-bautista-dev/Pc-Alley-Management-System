const express = require('express');
const router = express.Router();
const { Category, Product } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { cacheMiddleware, invalidateCache } = require('../middleware/cacheMiddleware');
const sequelize = require('../db');

const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// Get all categories (with product count)
router.get('/', authenticateToken, cacheMiddleware(300, 'categories'), async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: {
        include: [
          [
            sequelize.literal('(SELECT COUNT(*) FROM products WHERE products.category_id = Category.id AND products.deleted_at IS NULL)'),
            'productCount'
          ]
        ]
      },
      order: [['name', 'ASC']]
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active categories (for dropdowns / POS)
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { status: 'active' },
      order: [['name', 'ASC']]
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new category
router.post('/', [authenticateToken, authorizeRoles('super_admin')], async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({ error: 'Category name must be between 2 and 50 characters.' });
    }
    const slug = slugify(name);
    const category = await Category.create({
      name,
      slug,
      status: req.body.status || 'active'
    });
    invalidateCache('categories');
    res.status(201).json(category);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Category name already exists.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Reassign products from one category to another
router.post('/:id/reassign', [authenticateToken, authorizeRoles('super_admin')], async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { targetCategoryId } = req.body;

    if (!targetCategoryId) {
      await t.rollback();
      return res.status(400).json({ error: 'Target category ID is required.' });
    }

    if (parseInt(id) === parseInt(targetCategoryId)) {
      await t.rollback();
      return res.status(400).json({ error: 'Target category cannot be the same as the source category.' });
    }

    const [sourceCategory, targetCategory] = await Promise.all([
      Category.findByPk(id, { transaction: t }),
      Category.findByPk(targetCategoryId, { transaction: t })
    ]);

    if (!sourceCategory) {
      await t.rollback();
      return res.status(404).json({ error: 'Source category not found.' });
    }

    if (!targetCategory) {
      await t.rollback();
      return res.status(404).json({ error: 'Target category not found.' });
    }

    const [updatedCount] = await Product.update(
      { category_id: targetCategory.id },
      { where: { category_id: sourceCategory.id }, transaction: t }
    );

    await t.commit();
    invalidateCache('categories');
    res.json({
      message: `Successfully reassigned ${updatedCount} products to ${targetCategory.name}.`,
      reassignedCount: updatedCount
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
});

// Update category (name and/or status)
router.patch('/:id', [authenticateToken, authorizeRoles('super_admin')], async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    const { name, status } = req.body;

    if (name !== undefined) {
      const trimmed = typeof name === 'string' ? name.trim() : '';
      if (!trimmed || trimmed.length < 2 || trimmed.length > 50) {
        return res.status(400).json({ error: 'Category name must be between 2 and 50 characters.' });
      }
      category.name = trimmed;
      category.slug = slugify(trimmed);
    }

    if (status !== undefined) {
      if (!['active', 'inactive', 'archived'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value. Must be active, inactive, or archived.' });
      }
      category.status = status;
    }

    await category.save();
    invalidateCache('categories');
    res.json(category);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Category name already exists.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete category (soft delete with reference check)
router.delete('/:id', [authenticateToken, authorizeRoles('super_admin')], async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    // Check if active products reference this category
    const productCount = await Product.count({ where: { category_id: req.params.id } });
    if (productCount > 0) {
      return res.status(400).json({
        error: `Cannot delete category. It is currently linked with ${productCount} products. Please reassign products first or archive the category.`,
        productCount
      });
    }

    await category.destroy();
    invalidateCache('categories');
    res.json({ message: 'Category deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
