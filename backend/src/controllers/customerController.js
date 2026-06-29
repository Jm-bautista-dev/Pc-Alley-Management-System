const { Customer, Branch, Sale, SaleItem } = require('../models');

const getAllCustomers = async (req, res) => {
  try {
    const where = {};
    // Branch admins only see their branch customers
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      where.branchId = req.user.branch_id;
    }
    // Super admin can filter by branch via query param
    if (req.user.role === 'super_admin' && req.query.branchId) {
      where.branchId = req.query.branchId;
    }

    const customers = await Customer.findAll({
      where,
      include: [{ model: Branch, attributes: ['name'] }],
      order: [['totalSpent', 'DESC']]
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [{ model: Branch, attributes: ['name'] }]
    });
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });

    // Validate branch authorization
    if (req.user.role !== 'super_admin' && customer.branchId !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You cannot access customers outside your branch.' });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCustomerHistory = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });

    // Validate branch authorization
    if (req.user.role !== 'super_admin' && customer.branchId !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You cannot access customers outside your branch.' });
    }

    const sales = await Sale.findAll({
      where: { customerId: req.params.id },
      include: [{ model: SaleItem }],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({
      customer,
      sales,
      totalSpent:  parseFloat(customer.totalSpent || 0),
      totalOrders: parseInt(customer.totalOrders || 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { name, email, phone, address, branchId } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required.' });

    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
      }
    }

    if (phone && phone.trim()) {
      const digits = phone.replace(/[^0-9]/g, '');
      if (digits.length !== 11) {
        return res.status(400).json({ message: 'Phone number must contain exactly 11 digits.' });
      }
      if (!digits.startsWith('09')) {
        return res.status(400).json({ message: 'Phone number must start with 09.' });
      }
      if (/^(.)\1+$/.test(digits)) {
        return res.status(400).json({ message: 'Phone number cannot consist of only repeating identical digits.' });
      }
    }

    const targetBranchId = req.user.role !== 'super_admin' ? req.user.branch_id : (branchId || null);

    const customer = await Customer.create({
      name: name.trim(),
      email: (email && email.trim()) || null,
      phone: (phone && phone.trim()) || null,
      address: address || null,
      branchId: targetBranchId
    });
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });

    // Validate branch authorization
    if (req.user.role !== 'super_admin' && customer.branchId !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You cannot modify customers outside your branch.' });
    }

    const { name, email, phone, address, branchId } = req.body;
    if (name !== undefined) {
      if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required.' });
      customer.name = name.trim();
    }
    if (email !== undefined) {
      if (email && email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ message: 'Please enter a valid email address.' });
        }
        customer.email = email.trim();
      } else {
        customer.email = null;
      }
    }
    if (phone !== undefined) {
      if (phone && phone.trim()) {
        const digits = phone.replace(/[^0-9]/g, '');
        if (digits.length !== 11) {
          return res.status(400).json({ message: 'Phone number must contain exactly 11 digits.' });
        }
        if (!digits.startsWith('09')) {
          return res.status(400).json({ message: 'Phone number must start with 09.' });
        }
        if (/^(.)\1+$/.test(digits)) {
          return res.status(400).json({ message: 'Phone number cannot consist of only repeating identical digits.' });
        }
        customer.phone = digits;
      } else {
        customer.phone = null;
      }
    }
    if (address !== undefined) {
      customer.address = address;
    }
    
    if (branchId !== undefined) {
      customer.branchId = req.user.role !== 'super_admin' ? req.user.branch_id : (branchId || null);
    }

    await customer.save();
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });

    // Validate branch authorization
    if (req.user.role !== 'super_admin' && customer.branchId !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You cannot delete customers outside your branch.' });
    }

    await customer.destroy();
    res.json({ message: 'Customer removed.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Quick search for the POS terminal customer lookup
const searchCustomers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const { Op } = require('sequelize');
    const where = {
      [Op.or]: [
        { name:  { [Op.like]: `%${q}%` } },
        { phone: { [Op.like]: `%${q}%` } },
        { email: { [Op.like]: `%${q}%` } }
      ]
    };

    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      where.branchId = req.user.branch_id;
    }

    const customers = await Customer.findAll({
      where,
      attributes: ['id', 'name', 'phone', 'email', 'totalSpent', 'totalOrders'],
      limit: 10
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  getCustomerHistory,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers
};
