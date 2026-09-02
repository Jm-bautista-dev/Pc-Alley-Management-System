const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
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

router.post('/', [
  body('customer_name')
    .trim()
    .notEmpty().withMessage('Customer name is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Customer name must be between 2 and 100 characters.')
    .custom(val => !/\d/.test(val)).withMessage('Customer name cannot contain numbers.')
    .matches(/^[A-Za-z\s.\'-]+$/).withMessage('Customer name can only contain letters, spaces, hyphens, apostrophes, and dots.'),
  body('valid_until')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Valid until must be a valid date.'),
  body('subtotal')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 10000000 }).withMessage('Subtotal must be between ₱0.00 and ₱10,000,000.00.'),
  body('note')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Note cannot exceed 1000 characters.'),
  validate
], async (req, res) => {
  try {
    const { customer_name, valid_until, items, note, subtotal, status } = req.body;
    const warranty = await Warranty.create({
      customer_name: customer_name.trim(),
      valid_until: valid_until || null,
      items: items || null,
      note: note ? note.trim().slice(0, 1000) : '',
      subtotal: subtotal !== undefined ? parseFloat(subtotal) : 0,
      status: status || 'Draft',
      createdBy: req.user.id
    });
    res.status(201).json(warranty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', [
  param('id').isInt().withMessage('Invalid warranty ID.'),
  body('customer_name')
    .optional()
    .trim()
    .notEmpty().withMessage('Customer name cannot be empty.')
    .isLength({ min: 2, max: 100 }).withMessage('Customer name must be between 2 and 100 characters.')
    .custom(val => !/\d/.test(val)).withMessage('Customer name cannot contain numbers.')
    .matches(/^[A-Za-z\s.\'-]+$/).withMessage('Customer name can only contain letters, spaces, hyphens, apostrophes, and dots.'),
  body('subtotal')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 10000000 }).withMessage('Subtotal must be between ₱0.00 and ₱10,000,000.00.'),
  body('void_reason')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Void reason cannot exceed 1000 characters.'),
  validate
], async (req, res) => {
  try {
    const warranty = await Warranty.findByPk(req.params.id);
    if (!warranty) return res.status(404).json({ error: 'Warranty not found' });
    const { customer_name, valid_until, items, note, subtotal, status, void_reason } = req.body;
    const updateData = {
      customer_name: customer_name !== undefined ? customer_name.trim() : warranty.customer_name,
      valid_until: valid_until ?? warranty.valid_until,
      items: items ?? warranty.items,
      note: note !== undefined ? (note ? note.trim().slice(0, 1000) : '') : warranty.note,
      subtotal: subtotal !== undefined ? parseFloat(subtotal) : warranty.subtotal,
      status: status ?? warranty.status
    };
    if (status === 'Void') {
      updateData.void_reason = void_reason ? String(void_reason).trim() : (warranty.void_reason || 'No cancellation reason specified');
      updateData.voided_at = new Date();
    } else if (void_reason !== undefined) {
      updateData.void_reason = void_reason ? String(void_reason).trim() : null;
    }
    await warranty.update(updateData);
    res.json(warranty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', [
  param('id').isInt().withMessage('Invalid warranty ID.'),
  validate
], async (req, res) => {
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

