const sequelize = require('../db');
const { Sale, SaleItem, Customer, Inventory, Product, Branch, Category } = require('../models');
const { Op } = require('sequelize');

// 1. Dashboard Overview Metrics
const getDashboardMetrics = async (req, res) => {
  try {
    const branchId = req.user.role !== 'super_admin' ? req.user.branch_id : req.query.branchId;
    const { days, startDate, endDate } = req.query;

    const whereSale = { status: 'completed' };
    const whereInventory = {};

    if (branchId) {
      whereSale.branchId = branchId;
      whereInventory.branch_id = branchId;
    }

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

    // Total Revenue
    const revenueStats = await Sale.findOne({
      where: whereSale,
      attributes: [[sequelize.fn('SUM', sequelize.col('totalAmount')), 'total']],
      raw: true
    });
    const totalRevenue = parseFloat(revenueStats?.total || 0);

    // Total Orders
    const totalOrders = await Sale.count({ where: whereSale });

    // Total Stock (current snapshot)
    const stockStats = await Inventory.findOne({
      where: whereInventory,
      attributes: [[sequelize.fn('SUM', sequelize.col('quantity')), 'total']],
      raw: true
    });
    const totalStock = parseInt(stockStats?.total || 0);

    // Products Sold
    const productsSoldStats = await SaleItem.findOne({
      attributes: [[sequelize.fn('SUM', sequelize.col('SaleItem.quantity')), 'total']],
      include: [{
        model: Sale,
        attributes: [],
        where: whereSale
      }],
      raw: true
    });
    const productsSold = parseInt(productsSoldStats?.total || 0);

    // Growth Rates Calculation
    const prevWhereSale = { status: 'completed' };
    if (branchId) prevWhereSale.branchId = branchId;
    let hasGrowth = false;

    if (startDate && endDate) {
      const d1 = new Date(startDate);
      const d2 = new Date(new Date(endDate).setHours(23, 59, 59, 999));
      const diff = Math.abs(d2 - d1);
      const prevD1 = new Date(d1.getTime() - diff);
      const prevD2 = new Date(d1.getTime() - 1);
      prevWhereSale.createdAt = { [Op.between]: [prevD1, prevD2] };
      hasGrowth = true;
    } else if (days) {
      const daysNum = parseInt(days);
      const d1 = new Date();
      d1.setDate(d1.getDate() - daysNum);
      const prevD1 = new Date();
      prevD1.setDate(d1.getDate() - daysNum * 2);
      const prevD2 = new Date(d1.getTime() - 1);
      prevWhereSale.createdAt = { [Op.between]: [prevD1, prevD2] };
      hasGrowth = true;
    } else {
      // Default: Last 30 days vs 30 days before that
      const daysNum = 30;
      const d1 = new Date();
      d1.setDate(d1.getDate() - daysNum);
      const prevD1 = new Date();
      prevD1.setDate(d1.getDate() - daysNum * 2);
      const prevD2 = new Date(d1.getTime() - 1);
      prevWhereSale.createdAt = { [Op.between]: [prevD1, prevD2] };
      hasGrowth = true;
    }

    let growthPercentage = 0;
    let ordersGrowthPercentage = 0;
    let productsSoldGrowthPercentage = 0;

    if (hasGrowth) {
      const prevRevenueStats = await Sale.findOne({
        where: prevWhereSale,
        attributes: [[sequelize.fn('SUM', sequelize.col('totalAmount')), 'total']],
        raw: true
      });
      const prevRevenue = parseFloat(prevRevenueStats?.total || 0);
      if (prevRevenue > 0) {
        growthPercentage = parseFloat(((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(2));
      } else if (totalRevenue > 0) {
        growthPercentage = 100.0;
      }

      const prevOrders = await Sale.count({ where: prevWhereSale });
      if (prevOrders > 0) {
        ordersGrowthPercentage = parseFloat(((totalOrders - prevOrders) / prevOrders * 100).toFixed(2));
      } else if (totalOrders > 0) {
        ordersGrowthPercentage = 100.0;
      }

      const prevProductsSoldStats = await SaleItem.findOne({
        attributes: [[sequelize.fn('SUM', sequelize.col('SaleItem.quantity')), 'total']],
        include: [{
          model: Sale,
          attributes: [],
          where: prevWhereSale
        }],
        raw: true
      });
      const prevProductsSold = parseInt(prevProductsSoldStats?.total || 0);
      if (prevProductsSold > 0) {
        productsSoldGrowthPercentage = parseFloat(((productsSold - prevProductsSold) / prevProductsSold * 100).toFixed(2));
      } else if (productsSold > 0) {
        productsSoldGrowthPercentage = 100.0;
      }
    }

    // Top Branches Revenue
    const branchStats = await Sale.findAll({
      where: whereSale,
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
      productsSold,
      growthPercentage,
      ordersGrowthPercentage,
      productsSoldGrowthPercentage,
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
    const { days, startDate, endDate } = req.query;
    const branches = await Branch.findAll();
    const performance = [];

    const whereSale = { status: 'completed' };
    const prevWhereSale = { status: 'completed' };
    let hasGrowth = false;

    if (startDate && endDate) {
      const d1 = new Date(startDate);
      const d2 = new Date(new Date(endDate).setHours(23, 59, 59, 999));
      whereSale.createdAt = { [Op.between]: [d1, d2] };

      const diff = Math.abs(d2 - d1);
      const prevD1 = new Date(d1.getTime() - diff);
      const prevD2 = new Date(d1.getTime() - 1);
      prevWhereSale.createdAt = { [Op.between]: [prevD1, prevD2] };
      hasGrowth = true;
    } else if (days) {
      const daysNum = parseInt(days);
      const d1 = new Date();
      d1.setDate(d1.getDate() - daysNum);
      whereSale.createdAt = { [Op.gte]: d1 };

      const prevD1 = new Date();
      prevD1.setDate(d1.getDate() - daysNum * 2);
      const prevD2 = new Date(d1.getTime() - 1);
      prevWhereSale.createdAt = { [Op.between]: [prevD1, prevD2] };
      hasGrowth = true;
    } else {
      // Default: Last 30 days vs 30 days before that
      const daysNum = 30;
      const d1 = new Date();
      d1.setDate(d1.getDate() - daysNum);
      whereSale.createdAt = { [Op.gte]: d1 };

      const prevD1 = new Date();
      prevD1.setDate(d1.getDate() - daysNum * 2);
      const prevD2 = new Date(d1.getTime() - 1);
      prevWhereSale.createdAt = { [Op.between]: [prevD1, prevD2] };
      hasGrowth = true;
    }

    for (const b of branches) {
      // Branch Revenue & Orders
      const salesStats = await Sale.findOne({
        where: { ...whereSale, branchId: b.id },
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
          where: { ...whereSale, branchId: b.id }
        }],
        group: ['productId', 'productName'],
        order: [[sequelize.literal('totalSold'), 'DESC']],
        raw: true
      });

      // Growth % Calculation
      let growth = 0;
      if (hasGrowth) {
        const prevRevenueStats = await Sale.findOne({
          where: { ...prevWhereSale, branchId: b.id },
          attributes: [[sequelize.fn('SUM', sequelize.col('totalAmount')), 'total']],
          raw: true
        });
        const prevRev = parseFloat(prevRevenueStats?.total || 0);
        if (prevRev > 0) {
          growth = parseFloat(((revenue - prevRev) / prevRev * 100).toFixed(2));
        } else if (revenue > 0) {
          growth = 100.0;
        }
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
    const { days, startDate, endDate } = req.query;
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
    let confidence = 'Low';

    if (trends.length > 1) {
      const n = trends.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      trends.forEach((t, i) => {
        const x = i + 1;
        const y = parseFloat(t.revenue) || 0;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      });

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      forecast = parseFloat((slope * (n + 1) + intercept).toFixed(2));
      confidence = n >= 6 ? 'High' : 'Medium';
      if (forecast < 0) forecast = 0;
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
    const { days, startDate, endDate } = req.query;
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

    const stats = await SaleItem.findAll({
      attributes: [
        'productId', 'productName', 'productSku',
        [sequelize.fn('SUM', sequelize.col('SaleItem.quantity')), 'quantitySold'],
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
