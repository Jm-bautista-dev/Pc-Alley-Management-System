const express = require('express');
const router = express.Router();
const { Supplier } = require('../models');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const suppliers = await Supplier.findAll();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_person, phone, email, address } = req.body;
    
    // Field validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Supplier name is required.' });
    }
    
    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }
    
    // Update fields matching database format
    supplier.name = name.trim();
    supplier.contact_person = contact_person ? contact_person.trim() : null;
    supplier.phone = phone ? phone.trim() : null;
    supplier.email = email ? email.trim() : null;
    supplier.address = address ? address.trim() : null;
    
    await supplier.save();
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }
    
    if (updates.name !== undefined && (!updates.name || updates.name.trim() === '')) {
      return res.status(400).json({ error: 'Supplier name cannot be empty.' });
    }
    
    if (updates.name !== undefined) supplier.name = updates.name.trim();
    if (updates.contact_person !== undefined) supplier.contact_person = updates.contact_person ? updates.contact_person.trim() : null;
    if (updates.phone !== undefined) supplier.phone = updates.phone ? updates.phone.trim() : null;
    if (updates.email !== undefined) supplier.email = updates.email ? updates.email.trim() : null;
    if (updates.address !== undefined) supplier.address = updates.address ? updates.address.trim() : null;
    
    await supplier.save();
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
