const sequelize = require('../db');
const { Sale, SaleItem, Customer, Inventory, Product, Branch, Category } = require('../models');
const { Op } = require('sequelize');

// 1. Dashboard Overview Metrics
const getDashboardMetrics = async (req, res) => {
  try {
    const branchId = req.user.role !== 'super_admin' ? req.user.branch_id : req.query.branchId;
    const whereSale = { status: 'completed' };
    const whereInventory = {};

    if (branchId) {
      whereSale.branchId = branchId;
      whereInventory.branch_id = branchId;
    }

    // Total Revenue
    const revenueStats = await Sale.findOne({
      where: whereSale,
      attributes: [[sequelize.fn('SUM', sequelize.col('totalAmount')), 'total']],
      raw: true
    });
    const totalRevenue = parseFloat(revenueStats?.total || 0);

    // Total Orders
    const totalOrders = await Sale.count({ where: whereSale });

    // Total Stock
    const stockStats = await Inventory.findOne({
      where: whereInventory,
      attributes: [[sequelize.fn('SUM', sequelize.col('quantity')), 'total']],
      raw: true
    });
    const totalStock = parseInt(stockStats?.total || 0);

    // Top Branches Revenue
    const branchStats = await Sale.findAll({
      where: { status: 'completed' },
      attributes: [
        'branchId',
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue']
      ],
      include: [{ model: Branch, attributes: ['name'] }],
      group: ['branchId', 'Branch.id'],
      order: [[sequelize.literal('revenue'), 'DESC']],
      limit: 5
    });

    // Monthly Sales Trend
    const trends = await Sale.findAll({
      where: whereSale,
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m'), 'month'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue']
      ],
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m'), 'ASC']],
      limit: 12
    });

    res.json({
      totalRevenue,
      totalOrders,
      totalStock,
      topBranches: branchStats.map(b => ({
        branchId: b.branchId,
        branchName: b.Branch?.name || `Branch #${b.branchId}`,
        revenue: parseFloat(b.getDataValue('revenue') || 0)
      })),
      monthlyTrends: trends.map(t => ({
        month: t.getDataValue('month'),
        revenue: parseFloat(t.getDataValue('revenue') || 0)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Branch Performance Metrics
const getBranchPerformance = async (req, res) => {
  try {
    const branches = await Branch.findAll();
    const performance = [];

    for (const b of branches) {
      // Branch Revenue & Orders
      const salesStats = await Sale.findOne({
        where: { branchId: b.id, status: 'completed' },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'orders']
        ],
        raw: true
      });
      const revenue = parseFloat(salesStats?.revenue || 0);
      const orders = parseInt(salesStats?.orders || 0);

      // Best Selling Product in Branch
      const topProduct = await SaleItem.findOne({
        attributes: [
          'productId', 'productName',
          [sequelize.fn('SUM', sequelize.col('quantity')), 'totalSold']
        ],
        include: [{
          model: Sale,
          attributes: [],
          where: { branchId: b.id, status: 'completed' }
        }],
        group: ['productId', 'productName'],
        order: [[sequelize.literal('totalSold'), 'DESC']],
        raw: true
      });

      // Growth % Calculation (Current month vs Previous month)
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const prevDate = new Date();
      prevDate.setMonth(prevDate.getMonth() - 1);
      const prevMonth = prevDate.toISOString().slice(0, 7);

      const curRevenueStats = await Sale.findOne({
        where: {
          branchId: b.id,
          status: 'completed',
          createdAt: { [Op.like]: `${currentMonth}%` }
        },
        attributes: [[sequelize.fn('SUM', sequelize.col('totalAmount')), 'total']],
        raw: true
      });
      const prevRevenueStats = await Sale.findOne({
        where: {
          branchId: b.id,
          status: 'completed',
          createdAt: { [Op.like]: `${prevMonth}%` }
        },
        attributes: [[sequelize.fn('SUM', sequelize.col('totalAmount')), 'total']],
        raw: true
      });

      const curRev = parseFloat(curRevenueStats?.total || 0);
      const prevRev = parseFloat(prevRevenueStats?.total || 0);
      let growth = 0;
      if (prevRev > 0) {
        growth = parseFloat(((curRev - prevRev) / prevRev * 100).toFixed(2));
      } else if (curRev > 0) {
        growth = 100.0;
      }

      performance.push({
        branchId: b.id,
        branchName: b.name,
        revenue,
        orders,
        bestSeller: topProduct ? `${topProduct.productName} (${topProduct.totalSold} sold)` : 'N/A',
        growthPercentage: growth
      });
    }

    res.json(performance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Revenue Forecast (Linear Regression model using monthly trends)
const getRevenueForecast = async (req, res) => {
  try {
    const branchId = req.user.role !== 'super_admin' ? req.user.branch_id : req.query.branchId;
    const where = { status: 'completed' };
    if (branchId) where.branchId = branchId;

    const trends = await Sale.findAll({
      where,
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m'), 'month'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue']
      ],
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m'), 'ASC']],
      raw: true
    });

    let forecast = 0;
    let confidence = 'Low'; // Confidence level indicator

    if (trends.length > 1) {
      const n = trends.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      trends.forEach((t, i) => {
        const x = i + 1; // Month index
        const y = parseFloat(t.revenue) || 0;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      });

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      
      // Predict next index: n + 1
      forecast = parseFloat((slope * (n + 1) + intercept).toFixed(2));
      confidence = n >= 6 ? 'High' : 'Medium';
      if (forecast < 0) forecast = 0; // Prevent negative prediction
    } else if (trends.length === 1) {
      forecast = parseFloat(trends[0].revenue) || 0;
      confidence = 'Low';
    }

    res.json({
      historicalDataCount: trends.length,
      nextMonthIndex: trends.length + 1,
      predictedRevenue: forecast,
      confidenceScore: confidence
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Best Selling Products
const getBestSellers = async (req, res) => {
  try {
    const branchId = req.user.role !== 'super_admin' ? req.user.branch_id : req.query.branchId;
    const where = { status: 'completed' };
    if (branchId) where.branchId = branchId;

    const stats = await SaleItem.findAll({
      attributes: [
        'productId', 'productName', 'productSku',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'quantitySold'],
        [sequelize.fn('SUM', sequelize.col('subtotal')), 'revenueGenerated']
      ],
      include: [{
        model: Sale,
        attributes: [],
        where
      }],
      group: ['productId', 'productName', 'productSku'],
      order: [[sequelize.literal('quantitySold'), 'DESC']],
      limit: 10
    });

    res.json(stats.map(s => ({
      productId: s.productId,
      productName: s.productName,
      productSku: s.productSku,
      quantitySold: parseInt(s.getDataValue('quantitySold') || 0),
      revenueGenerated: parseFloat(s.getDataValue('revenueGenerated') || 0)
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Dead Stock Analysis
const getDeadStock = async (req, res) => {
  try {
    const days = parseInt(req.query.days || 30);
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    // Find all product IDs sold in the last N days
    const activeSales = await SaleItem.findAll({
      attributes: ['productId'],
      include: [{
        model: Sale,
        attributes: [],
        where: {
          status: 'completed',
          createdAt: { [Op.gte]: dateLimit }
        }
      }],
      group: ['productId'],
      raw: true
    });
    const activeProductIds = activeSales.map(s => s.productId).filter(Boolean);

    // Query products not in active sales list
    const deadProducts = await Product.findAll({
      where: {
        id: { [Op.notIn]: activeProductIds }
      },
      include: [Category],
      limit: 20
    });

    res.json(deadProducts.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price,
      category: p.Category?.name || 'N/A'
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6. Cross-Sell Insights
const getCrossSellInsights = async (req, res) => {
  try {
    // raw SQL combination matrix query for co-purchased item pairs
    const pairs = await sequelize.query(`
      SELECT 
        a.productId AS productIdA, a.productName AS productNameA,
        b.productId AS productIdB, b.productName AS productNameB,
        COUNT(*) AS frequency
      FROM saleitems a
      INNER JOIN saleitems b ON a.saleId = b.saleId AND a.productId < b.productId
      GROUP BY a.productId, a.productName, b.productId, b.productName
      ORDER BY frequency DESC
      LIMIT 15
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(pairs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 7. Customer Analytics
const getCustomerAnalytics = async (req, res) => {
  try {
    const customers = await Customer.findAll({
      order: [['totalSpent', 'DESC']],
      limit: 15
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getDashboardMetrics,
  getBranchPerformance,
  getRevenueForecast,
  getBestSellers,
  getDeadStock,
  getCrossSellInsights,
  getCustomerAnalytics
};
