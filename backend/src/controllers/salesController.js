const sequelize = require('../db');
const { Op } = require('sequelize');
const {
  Sale, SaleItem, Customer,
  Order, OrderItem,          // kept for legacy dashboard compat
  Product, Inventory, Category, StockMovement, Branch, User
} = require('../models');

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/** Generate a human-readable invoice number */
function generateInvoice() {
  const ts   = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `INV-${ts}-${rand}`;
}

// ─────────────────────────────────────────────────────────────────
// POST /api/sales  — Create a Sale (NEW, uses Sale/SaleItem models)
// ─────────────────────────────────────────────────────────────────
const createSale = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { customer_name, customer_id, items, payment_method, notes, amount_paid, change_amount } = req.body;
    const branch_id = req.user.role !== 'super_admin' ? req.user.branch_id : (req.body.branch_id || req.user.branch_id || 1);
    const user_id   = req.user.id;

    // Resolve customer ─────────────────────────────────────────────
    let customerId   = customer_id || null;
    let customerName = customer_name || 'Walk-in Customer';

    if (customerId) {
      const found = await Customer.findByPk(customerId);
      if (found) customerName = found.name;
    } else if (customerName && customerName !== 'Walk-in Customer') {
      // Try to find by name for convenience
      const found = await Customer.findOne({ where: { name: customerName } });
      if (found) customerId = found.id;
    }

    // Handle proof of payment file ──────────────────────────────────
    let proof_url = null;
    if (req.file) {
      proof_url = `/uploads/${req.file.filename}`;
    }

    // Build Sale shell ─────────────────────────────────────────────
    const invoiceNumber = generateInvoice();
    const staffName     = req.user.username || req.user.name || `User #${user_id}`;

    const amountPaidVal = amount_paid ? parseFloat(amount_paid) : 0;
    const changeAmountVal = change_amount ? parseFloat(change_amount) : 0;

    const sale = await Sale.create({
      invoiceNumber,
      customerId,
      customerName,
      branchId: branch_id,
      staffId:  user_id,
      staffName,
      totalAmount: 0,           // updated below
      paymentMethod: payment_method,
      amountPaid: amountPaidVal,
      changeAmount: changeAmountVal,
      status: 'completed',
      notes: notes || null
    }, { transaction });

    let totalAmount = 0;

    // Process each item ────────────────────────────────────────────
    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction });
      if (!product) throw new Error(`Product ${item.product_id} not found`);

      // Stock check
      const inventory = await Inventory.findOne({
        where: { product_id: product.id, branch_id },
        transaction
      });
      if (!inventory || inventory.quantity < item.quantity) {
        throw new Error(`Insufficient stock for "${product.name}" (available: ${inventory?.quantity ?? 0})`);
      }

      const unitPrice = parseFloat(product.price);
      const qty       = parseInt(item.quantity);
      const subtotal  = unitPrice * qty;

      // Create SaleItem with price/name snapshot
      await SaleItem.create({
        saleId:      sale.id,
        productId:   product.id,
        productName: product.name,
        productSku:  product.sku || null,
        quantity:    qty,
        unitPrice,
        subtotal
      }, { transaction });

      // Decrement inventory
      const prevStock = inventory.quantity;
      inventory.quantity -= qty;
      await inventory.save({ transaction });

      // Log StockMovement
      await StockMovement.create({
        product_id:     product.id,
        type:           'SALE',
        quantity:       -qty,
        previous_stock: prevStock,
        new_stock:      inventory.quantity,
        user_id,
        note: `Sale ${invoiceNumber}`
      }, { transaction });

      totalAmount += subtotal;
    }

    // Update Sale total ────────────────────────────────────────────
    sale.totalAmount = totalAmount;
    
    // Set fallback payment summary for non-cash if not specified by frontend
    const grandTotal = totalAmount * 1.12;
    if (payment_method !== 'cash' || !amount_paid) {
      sale.amountPaid = grandTotal;
      sale.changeAmount = 0.00;
    }
    await sale.save({ transaction });

    await transaction.commit();

    // Emit real-time dashboard update event
    if (req.app.get('io')) {
      req.app.get('io').emit('dashboard_update', { type: 'SALE', invoiceNumber });
    }

    // Post-commit: update Customer stats (non-fatal if it fails) ───
    if (customerId) {
      try {
        await Customer.increment(
          { totalSpent: totalAmount, totalOrders: 1 },
          { where: { id: customerId } }
        );
      } catch (statErr) {
        console.warn('[SALES] Could not update customer stats:', statErr.message);
      }
    }

    // Return full sale with items and relations
    const result = await Sale.findByPk(sale.id, {
      include: [
        { model: SaleItem },
        { model: Branch },
        { model: Customer, attributes: ['name', 'email', 'phone', 'address'] },
        { model: User, attributes: ['first_name', 'last_name', 'username'] }
      ]
    });
    res.status(201).json(result);

  } catch (error) {
    await transaction.rollback();
    console.error('[createSale] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
const getSalesHistory = async (req, res) => {
  try {
    const { days, startDate, endDate, page = 1, limit = 20, search = '' } = req.query;
    const pagination = require('../utils/pagination');
    const { offset, where, order } = pagination({ page, limit, search, searchableFields: ['customerName'] });
    const branchId = req.user.role === 'super_admin' ? req.query.branch_id : req.user.branch_id;
    if (branchId) where.branchId = branchId;
    
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [
          new Date(startDate),
          new Date(new Date(endDate).setHours(23, 59, 59, 999))
        ]
      };
    } else if (days) {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - parseInt(days));
      where.createdAt = { [Op.gte]: limitDate };
    }
    const sales = await Sale.findAll({
      where,
      include: [
        { model: SaleItem },
        { model: Branch, attributes: ['name'] },
        { model: Customer, attributes: ['name', 'email'] }
      ],
      order,
      offset,
      limit: Number(limit)
    });
    const total = await Sale.count({ where });
    res.json({
      data: sales,
      pagination: { page: Number(page), limit: Number(limit), total }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/sales/comparative  — Per-branch revenue summary
// ─────────────────────────────────────────────────────────────────
const getComparativeSales = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { days, startDate, endDate } = req.query;
    const whereSale = { status: 'completed' };

    if (startDate && endDate) {
      whereSale.createdAt = {
        [Op.between]: [
          new Date(startDate),
          new Date(new Date(endDate).setHours(23, 59, 59, 999))
        ]
      };
    } else if (days) {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - parseInt(days));
      whereSale.createdAt = { [Op.gte]: limitDate };
    }

    const branches = await Branch.findAll();
    const results  = [];

    for (const branch of branches) {
      const stats = await Sale.findOne({
        where: { ...whereSale, branchId: branch.id },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('totalAmount')), 'total_revenue'],
          [sequelize.fn('COUNT', sequelize.col('Sale.id')),   'order_count']
        ],
        raw: true
      });

      const topItem = await SaleItem.findOne({
        attributes: [
          'productName',
          [sequelize.fn('SUM', sequelize.col('quantity')), 'total_sold']
        ],
        include: [{
          model: Sale,
          attributes: [],
          where: { ...whereSale, branchId: branch.id }
        }],
        group: ['productName'],
        order: [[sequelize.literal('total_sold'), 'DESC']],
        raw: true
      });

      results.push({
        branch_id:    branch.id,
        branch_name:  branch.name,
        total_revenue: parseFloat(stats?.total_revenue || 0),
        order_count:  parseInt(stats?.order_count || 0),
        top_product:  topItem ? `${topItem.productName}` : 'N/A'
      });
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/sales/trends  — Monthly revenue aggregate
// ─────────────────────────────────────────────────────────────────
const getSalesTrends = async (req, res) => {
  try {
    const branchId = req.user.role === 'super_admin' ? req.query.branch_id : req.user.branch_id;
    const { days, startDate, endDate }  = req.query;
    const where = { status: 'completed' };
    if (branchId) where.branchId = branchId;
    
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [
          new Date(startDate),
          new Date(new Date(endDate).setHours(23, 59, 59, 999))
        ]
      };
    } else if (days) {
      const limit = new Date();
      limit.setDate(limit.getDate() - parseInt(days));
      where.createdAt = { [Op.gte]: limit };
    }

    const stats = await Sale.findAll({
      where,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue'],
        [sequelize.fn('COUNT', sequelize.col('Sale.id')), 'orders']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      limit: 30
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/sales/daily-trends  — Last 30 days revenue per day
// ─────────────────────────────────────────────────────────────────
const getDailyTrends = async (req, res) => {
  try {
    const branchId = req.user.role === 'super_admin' ? req.query.branch_id : req.user.branch_id;
    const { days, startDate, endDate } = req.query;
    const where  = { status: 'completed' };
    if (branchId) where.branchId = branchId;

    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [
          new Date(startDate),
          new Date(new Date(endDate).setHours(23, 59, 59, 999))
        ]
      };
    } else if (days) {
      const limit = new Date();
      limit.setDate(limit.getDate() - parseInt(days));
      where.createdAt = { [Op.gte]: limit };
    } else {
      const limit = new Date();
      limit.setDate(limit.getDate() - 30);
      where.createdAt = { [Op.gte]: limit };
    }

    const stats = await Sale.findAll({
      where,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue'],
        [sequelize.fn('COUNT', sequelize.col('Sale.id')), 'orders']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/sales/performance  — Top products by qty sold
// ─────────────────────────────────────────────────────────────────
const getProductPerformance = async (req, res) => {
  try {
    const branchId = req.user.role === 'super_admin' ? req.query.branch_id : req.user.branch_id;
    const { days, startDate, endDate }  = req.query;
    const saleWhere = { status: 'completed' };
    if (branchId) saleWhere.branchId = branchId;
    
    if (startDate && endDate) {
      saleWhere.createdAt = {
        [Op.between]: [
          new Date(startDate),
          new Date(new Date(endDate).setHours(23, 59, 59, 999))
        ]
      };
    } else if (days) {
      const limit = new Date();
      limit.setDate(limit.getDate() - parseInt(days));
      saleWhere.createdAt = { [Op.gte]: limit };
    }

    const stats = await SaleItem.findAll({
      attributes: [
        'productId', 'productName', 'productSku',
        [sequelize.fn('SUM', sequelize.col('SaleItem.quantity')), 'total_sold'],
        [sequelize.fn('SUM', sequelize.col('subtotal')),           'total_revenue']
      ],
      include: [{ model: Sale, attributes: [], where: saleWhere }],
      group: ['productId', 'productName', 'productSku'],
      order: [[sequelize.literal('total_sold'), 'DESC']],
      limit: 10
    });

    res.json(stats.map(s => ({
      product_id:    s.productId,
      name:          s.productName,
      sku:           s.productSku,
      total_sold:    parseInt(s.getDataValue('total_sold') || 0),
      total_revenue: parseFloat(s.getDataValue('total_revenue') || 0)
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createSale,
  // keep old name alias so any other import doesn't break
  createOrder: createSale,
  getSalesHistory,
  getComparativeSales,
  getSalesTrends,
  getDailyTrends,
  getProductPerformance
};
