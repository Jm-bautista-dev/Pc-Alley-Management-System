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
    const trimmedName = (name || '').trim();
    if (!trimmedName) return res.status(400).json({ message: 'Customer name is required.' });
    if (/\d/.test(trimmedName)) return res.status(400).json({ message: 'Customer name cannot contain numbers.' });
    if (!/^[A-Za-z\s.\'-]+$/.test(trimmedName)) return res.status(400).json({ message: 'Customer name can only contain letters, spaces, hyphens, apostrophes, and dots.' });
    if (trimmedName.length < 2 || trimmedName.length > 100) return res.status(400).json({ message: 'Customer name must be between 2 and 100 characters.' });

    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const lowerEmail = email.trim().toLowerCase();
      if (!emailRegex.test(lowerEmail) || /@(gamil|yaho|hotmial|outlok)\.com$/i.test(lowerEmail)) {
        return res.status(400).json({ message: 'Please enter a valid email address without domain typos.' });
      }
    }

    let cleanPhone = null;
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
      cleanPhone = digits;
    }

    const targetBranchId = req.user.role !== 'super_admin' ? req.user.branch_id : (branchId || null);

    const customer = await Customer.create({
      name: trimmedName,
      email: (email && email.trim().toLowerCase()) || null,
      phone: cleanPhone,
      address: address ? address.trim().slice(0, 255) : null,
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
      const trimmedUpdateName = (name || '').trim();
      if (!trimmedUpdateName) return res.status(400).json({ message: 'Customer name is required.' });
      if (/\d/.test(trimmedUpdateName)) return res.status(400).json({ message: 'Customer name cannot contain numbers.' });
      if (!/^[A-Za-z\s.\'-]+$/.test(trimmedUpdateName)) return res.status(400).json({ message: 'Customer name can only contain letters, spaces, hyphens, apostrophes, and dots.' });
      if (trimmedUpdateName.length < 2 || trimmedUpdateName.length > 100) return res.status(400).json({ message: 'Customer name must be between 2 and 100 characters.' });
      customer.name = trimmedUpdateName;
    }
    if (email !== undefined) {
      if (email && email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const lowerEmail = email.trim().toLowerCase();
        if (!emailRegex.test(lowerEmail) || /@(gamil|yaho|hotmial|outlok)\.com$/i.test(lowerEmail)) {
          return res.status(400).json({ message: 'Please enter a valid email address without domain typos.' });
        }
        customer.email = lowerEmail;
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
