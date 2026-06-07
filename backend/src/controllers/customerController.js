const { Customer, Branch, Sale, SaleItem } = require('../models');

const getAllCustomers = async (req, res) => {
  try {
    const where = {};
    // Branch admins only see their branch customers
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      where.branchId = req.user.branch_id;
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
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCustomerHistory = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });

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
    if (!name) return res.status(400).json({ message: 'Name is required.' });

    const customer = await Customer.create({
      name,
      email:    email    || null,
      phone:    phone    || null,
      address:  address  || null,
      branchId: branchId || req.user.branch_id || null
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

    const { name, email, phone, address, branchId } = req.body;
    if (name      !== undefined) customer.name      = name;
    if (email     !== undefined) customer.email     = email;
    if (phone     !== undefined) customer.phone     = phone;
    if (address   !== undefined) customer.address   = address;
    if (branchId  !== undefined) customer.branchId  = branchId || null;

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
    const customers = await Customer.findAll({
      where: {
        [Op.or]: [
          { name:  { [Op.like]: `%${q}%` } },
          { phone: { [Op.like]: `%${q}%` } },
          { email: { [Op.like]: `%${q}%` } }
        ]
      },
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
