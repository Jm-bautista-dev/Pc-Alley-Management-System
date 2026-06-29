const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { Supplier } = require('../models');
const { authenticateToken } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

// Validation rules for POST and PUT (all fields required)
const supplierValidationRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Company Name is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Company Name must be between 2 and 100 characters.'),
  body('contact_person')
    .trim()
    .notEmpty().withMessage('Supplier Name is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Supplier Name must be between 2 and 100 characters.')
    .matches(/^[A-Za-z\s.]+$/).withMessage('Supplier Name can only contain letters, spaces, and dots.'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone Number is required.')
    .matches(/^09\d{9}$/).withMessage('Phone number must start with 09 and contain exactly 11 digits.')
    .isLength({ min: 11, max: 11 }).withMessage('Phone number must be exactly 11 digits.'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email Address is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .isLength({ max: 100 }).withMessage('Email address must be at most 100 characters.'),
  body('address')
    .trim()
    .notEmpty().withMessage('Office Address is required.')
    .isLength({ max: 255 }).withMessage('Office address must be at most 255 characters.')
];

// Validation rules for PATCH (fields optional but must be valid if provided)
const supplierPatchValidationRules = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Company Name cannot be empty.')
    .isLength({ min: 2, max: 100 }).withMessage('Company Name must be between 2 and 100 characters.'),
  body('contact_person')
    .optional()
    .trim()
    .notEmpty().withMessage('Supplier Name cannot be empty.')
    .isLength({ min: 2, max: 100 }).withMessage('Supplier Name must be between 2 and 100 characters.')
    .matches(/^[A-Za-z\s.]+$/).withMessage('Supplier Name can only contain letters, spaces, and dots.'),
  body('phone')
    .optional()
    .trim()
    .notEmpty().withMessage('Phone Number cannot be empty.')
    .matches(/^09\d{9}$/).withMessage('Phone number must start with 09 and contain exactly 11 digits.')
    .isLength({ min: 11, max: 11 }).withMessage('Phone number must be exactly 11 digits.'),
  body('email')
    .optional()
    .trim()
    .notEmpty().withMessage('Email Address cannot be empty.')
    .isEmail().withMessage('Please provide a valid email address.')
    .isLength({ max: 100 }).withMessage('Email address must be at most 100 characters.'),
  body('address')
    .optional()
    .trim()
    .notEmpty().withMessage('Office Address cannot be empty.')
    .isLength({ max: 255 }).withMessage('Office address must be at most 255 characters.')
];

router.get('/', authenticateToken, async (req, res) => {
  try {
    const suppliers = await Supplier.findAll();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', [authenticateToken, ...supplierValidationRules, validate], async (req, res) => {
  try {
    const { name, contact_person, phone, email, address } = req.body;
    
    const supplier = await Supplier.create({
      name: name.trim(),
      contact_person: contact_person ? contact_person.trim() : null,
      phone: phone ? phone.trim() : null,
      email: email ? email.trim() : null,
      address: address ? address.trim() : null
    });
    
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', [authenticateToken, ...supplierValidationRules, validate], async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_person, phone, email, address } = req.body;
    
    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }
    
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

router.patch('/:id', [authenticateToken, ...supplierPatchValidationRules, validate], async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found.' });
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
