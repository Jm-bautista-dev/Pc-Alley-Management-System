const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { Warranty } = require('../models');

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const warranties = await Warranty.findAll({ order: [['createdAt', 'DESC']] });
    res.json(warranties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customer_name, valid_until, items, note, subtotal, status } = req.body;
    const warranty = await Warranty.create({
      customer_name,
      valid_until,
      items,
      note: note || '',
      subtotal: subtotal || 0,
      status: status || 'Draft',
      createdBy: req.user.id
    });
    res.status(201).json(warranty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const warranty = await Warranty.findByPk(req.params.id);
    if (!warranty) return res.status(404).json({ error: 'Warranty not found' });
    const { customer_name, valid_until, items, note, subtotal, status } = req.body;
    await warranty.update({
      customer_name: customer_name ?? warranty.customer_name,
      valid_until: valid_until ?? warranty.valid_until,
      items: items ?? warranty.items,
      note: note ?? warranty.note,
      subtotal: subtotal ?? warranty.subtotal,
      status: status ?? warranty.status
    });
    res.json(warranty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const warranty = await Warranty.findByPk(req.params.id);
    if (!warranty) return res.status(404).json({ error: 'Warranty not found' });
    await warranty.update(req.body);
    res.json(warranty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const warranty = await Warranty.findByPk(req.params.id);
    if (!warranty) return res.status(404).json({ error: 'Warranty not found' });
    await warranty.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
