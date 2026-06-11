const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { Branch } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, authorizeRoles('super_admin', 'branch_admin', 'employee'), async (req, res) => {
  try {
    const branches = await Branch.findAll();
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', [
  authenticateToken, 
  authorizeRoles('super_admin'),
  body('name').notEmpty().trim().withMessage('Branch name is required'),
  body('location').optional({ checkFalsy: true }).isString().trim(),
  body('phone').optional({ checkFalsy: true }).isString().trim(),
  validate
], async (req, res) => {
  try {
    const { name, location, phone } = req.body;

    const branch = await Branch.create({ name, location, phone });

    // Auto-initialize inventory for ALL existing products in the new branch
    const { Product, Inventory } = require('../models');
    const products = await Product.findAll({ attributes: ['id'] });
    if (products.length > 0) {
      const inventoryRecords = products.map(p => ({
        product_id: p.id,
        branch_id: branch.id,
        quantity: 0,
        low_stock_threshold: 5
      }));
      await Inventory.bulkCreate(inventoryRecords, { ignoreDuplicates: true });
    }

    res.status(201).json(branch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', [
  authenticateToken, 
  authorizeRoles('super_admin'),
  param('id').isInt().withMessage('Invalid branch ID'),
  body('name').optional().notEmpty().trim().withMessage('Branch name cannot be empty'),
  body('location').optional({ checkFalsy: true }).isString().trim(),
  body('phone').optional({ checkFalsy: true }).isString().trim(),
  validate
], async (req, res) => {
  try {
    const { name, location, phone } = req.body;
    const branch = await Branch.findByPk(req.params.id);
    
    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    await branch.update({ name, location, phone });
    res.json(branch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', [
  authenticateToken, 
  authorizeRoles('super_admin'),
  param('id').isInt().withMessage('Invalid branch ID'),
  validate
], async (req, res) => {
  try {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    await branch.destroy();
    res.json({ message: 'Branch decommissioned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
