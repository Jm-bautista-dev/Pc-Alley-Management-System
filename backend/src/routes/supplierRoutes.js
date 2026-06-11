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

module.exports = router;
