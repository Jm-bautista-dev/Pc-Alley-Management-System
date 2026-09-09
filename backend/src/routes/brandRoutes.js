const express = require('express');
const router = express.Router();
const { Brand, Product } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const imageService = require('../services/imageService');
const sequelize = require('../db');
const { Op } = require('sequelize');

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

// GET all brands (for admin list)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const brands = await Brand.findAll({
      attributes: {
        include: [
          [
            sequelize.literal('(SELECT COUNT(*) FROM Products WHERE Products.brand_id = Brand.id AND Products.deleted_at IS NULL)'),
            'productCount'
          ]
        ]
      },
      order: [['name', 'ASC']]
    });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET active brands (for POS / dropdowns, optional category filter)
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const { category_id } = req.query;
    const where = { status: 'active' };

    if (category_id && category_id !== 'All') {
      const products = await Product.findAll({
        where: { category_id: parseInt(category_id), brand_id: { [Op.ne]: null } },
        attributes: ['brand_id'],
        raw: true
      });
      const brandIds = [...new Set(products.map(p => p.brand_id))];
      where.id = { [Op.in]: brandIds };
    }

    const brands = await Brand.findAll({
      where,
      order: [['name', 'ASC']]
    });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create brand (Super Admin only)
router.post('/', [authenticateToken, authorizeRoles('super_admin'), upload.single('logo')], async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const cleanName = (name || '').trim();
    if (!cleanName) {
      return res.status(400).json({ error: 'Brand name is required.' });
    }
    if (cleanName.length < 2 || cleanName.length > 50) {
      return res.status(400).json({ error: 'Brand name must be between 2 and 50 characters.' });
    }
    if (description && description.length > 255) {
      return res.status(400).json({ error: 'Description cannot exceed 255 characters.' });
    }

    const slug = slugify(cleanName);
    // Check duplicate
    const existing = await Brand.findOne({ where: { [Op.or]: [{ name: cleanName }, { slug }] } });
    if (existing) {
      return res.status(400).json({ error: 'Brand name or slug already exists.' });
    }

    let logo = null;
    if (req.file) {
      try {
        logo = await imageService.processBrandLogo(req.file.buffer);
      } catch (imgError) {
        return res.status(400).json({ error: 'Logo upload failed: ' + imgError.message });
      }
    }

    const brand = await Brand.create({
      name: cleanName,
      slug,
      logo,
      description: (description || '').trim() || null,
      status: status || 'active'
    });

    res.status(201).json(brand);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH update brand (Super Admin & Branch Admin)
router.patch('/:id', [authenticateToken, authorizeRoles('super_admin', 'branch_admin'), upload.single('logo')], async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, remove_logo } = req.body;

    const brand = await Brand.findByPk(id);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found.' });
    }

    if (name !== undefined) {
      const cleanName = (name || '').trim();
      if (!cleanName) {
        return res.status(400).json({ error: 'Brand name cannot be empty.' });
      }
      if (cleanName.length < 2 || cleanName.length > 50) {
        return res.status(400).json({ error: 'Brand name must be between 2 and 50 characters.' });
      }
      if (cleanName !== brand.name) {
        const slug = slugify(cleanName);
        const existing = await Brand.findOne({ where: { [Op.and]: [{ id: { [Op.ne]: id } }, { [Op.or]: [{ name: cleanName }, { slug }] }] } });
        if (existing) {
          return res.status(400).json({ error: 'Brand name or slug already exists.' });
        }
        brand.name = cleanName;
        brand.slug = slug;
      }
    }

    if (description !== undefined) {
      if (description && description.length > 255) {
        return res.status(400).json({ error: 'Description cannot exceed 255 characters.' });
      }
      brand.description = (description || '').trim() || null;
    }
    if (status !== undefined) brand.status = status;

    if (req.file) {
      // delete old logo
      if (brand.logo) {
        imageService.deleteBrandLogo(brand.logo);
      }
      try {
        brand.logo = await imageService.processBrandLogo(req.file.buffer);
      } catch (imgError) {
        return res.status(400).json({ error: 'Logo upload failed: ' + imgError.message });
      }
    } else if (remove_logo === 'true' || remove_logo === true) {
      if (brand.logo) {
        imageService.deleteBrandLogo(brand.logo);
      }
      brand.logo = null;
    }

    await brand.save();
    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE brand (Super Admin only)
router.delete('/:id', [authenticateToken, authorizeRoles('super_admin')], async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await Brand.findByPk(id);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found.' });
    }

    // Check if products use this brand
    const productCount = await Product.count({ where: { brand_id: id } });
    if (productCount > 0) {
      return res.status(400).json({ error: `Cannot delete brand. It is currently linked with ${productCount} products. Try archiving it instead.` });
    }

    if (brand.logo) {
      imageService.deleteBrandLogo(brand.logo);
    }

    await brand.destroy();
    res.json({ message: 'Brand deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
