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
  const getNextMonth = (lastMonthStr, stepsAhead) => {
    if (!lastMonthStr) return new Date().toISOString().substring(0, 7);
    let parts = lastMonthStr.split('-');
    let year = parseInt(parts[0]);
    let month = parseInt(parts[1]);
    let d = new Date(year, month - 1 + stepsAhead, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  try {
    const branchId = req.user.role !== 'super_admin' ? req.user.branch_id : req.query.branchId;
    const period = parseInt(req.query.period || 3); // forecast horizon (1, 3, or 6 months)
    
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

    let slope = 0;
    let intercept = 0;
    let confidence = 'Low';
    let projections = [];
    let diagnostics = [];
    let recommendations = [];

    const n = trends.length;
    
    if (n === 0) {
      trends.push({ month: new Date().toISOString().substring(0, 7), revenue: 0 });
    }

    const lastMonthStr = trends[trends.length - 1].month;

    if (n > 1) {
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      trends.forEach((t, i) => {
        const x = i + 1;
        const y = parseFloat(t.revenue) || 0;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      });

      const denominator = n * sumXX - sumX * sumX;
      if (denominator !== 0) {
        slope = (n * sumXY - sumX * sumY) / denominator;
        intercept = (sumY - slope * sumX) / n;
      } else {
        slope = 0;
        intercept = parseFloat(trends[0].revenue) || 0;
      }
      confidence = n >= 6 ? 'High' : 'Medium';
    } else {
      slope = 0;
      intercept = parseFloat(trends[0]?.revenue || 0);
      confidence = 'Low';
    }

    // Project forward
    for (let s = 1; s <= period; s++) {
      const nextMonthIdx = n + s;
      let revenue = parseFloat((slope * nextMonthIdx + intercept).toFixed(2));
      if (revenue < 0) revenue = 0;
      projections.push({
        month: getNextMonth(lastMonthStr, s),
        revenue
      });
    }

    // Get low stock alert count from database
    const { Inventory } = require('../models');
    const lowStockCount = await Inventory.count({
      where: {
        quantity: {
          [Op.lte]: sequelize.col('low_stock_threshold')
        }
      }
    });

    // Diagnostic explanations
    if (slope > 0) {
      diagnostics.push({
        type: 'growth',
        title: 'Upward Revenue Trend',
        description: `Revenue shows a monthly positive trajectory (+₱${slope.toLocaleString(undefined, { minimumFractionDigits: 2 })}/month). This suggests healthy sales and good customer retention.`
      });
    } else if (slope < 0) {
      diagnostics.push({
        type: 'decline',
        title: 'Downward Revenue Trend',
        description: `Revenue exhibits a retraction trend (-₱${Math.abs(slope).toLocaleString(undefined, { minimumFractionDigits: 2 })}/month). Recommend bundle promotions to mitigate the contraction.`
      });
    } else {
      diagnostics.push({
        type: 'stable',
        title: 'Stable Revenue',
        description: 'Revenue trends are flat or stationary, indicating consistent, steady trade operations.'
      });
    }

    if (lowStockCount > 0) {
      diagnostics.push({
        type: 'inventory_alert',
        title: 'Stockout Risk Warning',
        description: `Currently, ${lowStockCount} inventory items are at or below thresholds, posing a revenue ceiling risk due to potential stockouts.`
      });
    }

    // Prescriptive actions
    if (slope < 0) {
      recommendations.push({
        priority: 'High',
        title: 'Launch Bundle Promotions',
        action: 'Design and deploy bundle offers matching accessories with core components to increase the average checkout price.'
      });
    }
    if (lowStockCount > 0) {
      recommendations.push({
        priority: 'High',
        title: 'Procure Low-Stock Inventory',
        action: `Initiate restock orders for the ${lowStockCount} critical items to prevent lost demand from stockouts.`
      });
    }
    if (slope >= 0) {
      recommendations.push({
        priority: 'Medium',
        title: 'Expand Product Lines',
        action: 'Capitalize on sales growth by expanding offerings in high-margin peripherals and next-gen components.'
      });
    }
    recommendations.push({
      priority: 'Low',
      title: 'Analyze Supplier Efficiency',
      action: 'Evaluate supplier delivery performance to minimize cycle times and lower safety stock inventory levels.'
    });

    res.json({
      historicalDataCount: n,
      confidenceScore: confidence,
      slope,
      intercept,
      trends,
      projections,
      diagnostics,
      recommendations
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

const getForecastingAnalytics = async (req, res) => {
  const getNextPeriod = (lastPeriodStr, stepsAhead, mode) => {
    if (!lastPeriodStr) return new Date().toISOString().substring(0, 10);
    
    if (mode === 'daily' || mode === 'weekly') {
      const d = new Date(lastPeriodStr);
      const offset = mode === 'daily' ? stepsAhead : stepsAhead * 7;
      d.setDate(d.getDate() + offset);
      return d.toISOString().substring(0, 10);
    } else if (mode === 'monthly') {
      let parts = lastPeriodStr.split('-');
      let year = parseInt(parts[0]);
      let month = parseInt(parts[1]);
      let d = new Date(year, month - 1 + stepsAhead, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    } else if (mode === 'quarterly') {
      let parts = lastPeriodStr.split('-Q');
      let year = parseInt(parts[0]);
      let quarter = parseInt(parts[1]);
      
      let newQuarter = quarter + stepsAhead;
      while (newQuarter > 4) {
        newQuarter -= 4;
        year += 1;
      }
      return `${year}-Q${newQuarter}`;
    } else if (mode === 'yearly') {
      const year = parseInt(lastPeriodStr);
      return String(year + stepsAhead);
    }
    return lastPeriodStr;
  };

  try {
    const { startDate, endDate, groupBy = 'monthly', horizon = '3m', branchId } = req.query;

    const where = { status: 'completed' };
    if (branchId) where.branchId = branchId;

    let computedStart = startDate;
    let computedEnd = endDate;
    if (!computedStart || !computedEnd) {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 6);
      computedStart = start.toISOString().substring(0, 10);
      computedEnd = end.toISOString().substring(0, 10);
    }

    where.createdAt = {
      [Op.between]: [
        new Date(computedStart),
        new Date(new Date(computedEnd).setHours(23, 59, 59, 999))
      ]
    };

    // Grouping settings
    let groupField = '';
    if (groupBy === 'daily') {
      groupField = sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m-%d');
    } else if (groupBy === 'weekly') {
      groupField = sequelize.literal("DATE_FORMAT(DATE_SUB(createdAt, INTERVAL WEEKDAY(createdAt) DAY), '%Y-%m-%d')");
    } else if (groupBy === 'monthly') {
      groupField = sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m');
    } else if (groupBy === 'quarterly') {
      groupField = sequelize.literal("CONCAT(YEAR(createdAt), '-Q', QUARTER(createdAt))");
    } else if (groupBy === 'yearly') {
      groupField = sequelize.fn('YEAR', sequelize.col('createdAt'));
    } else {
      groupField = sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m');
    }

    // 1. Fetch raw records
    const rawSales = await Sale.findAll({
      where,
      attributes: [
        [groupField, 'period'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'transactions']
      ],
      group: [groupField],
      order: [[groupField, 'ASC']],
      raw: true
    });

    const rawInventory = await SaleItem.findAll({
      attributes: [
        [sequelize.literal(groupBy === 'weekly' ? "DATE_FORMAT(DATE_SUB(SaleItem.createdAt, INTERVAL WEEKDAY(SaleItem.createdAt) DAY), '%Y-%m-%d')" : (groupBy === 'quarterly' ? "CONCAT(YEAR(SaleItem.createdAt), '-Q', QUARTER(SaleItem.createdAt))" : (groupBy === 'yearly' ? "YEAR(SaleItem.createdAt)" : (groupBy === 'daily' ? "DATE_FORMAT(SaleItem.createdAt, '%Y-%m-%d')" : "DATE_FORMAT(SaleItem.createdAt, '%Y-%m')")))), 'period'],
        [sequelize.fn('SUM', sequelize.col('SaleItem.quantity')), 'quantitySold']
      ],
      include: [{ model: Sale, attributes: [], where }],
      group: [sequelize.literal(groupBy === 'weekly' ? "DATE_FORMAT(DATE_SUB(SaleItem.createdAt, INTERVAL WEEKDAY(SaleItem.createdAt) DAY), '%Y-%m-%d')" : (groupBy === 'quarterly' ? "CONCAT(YEAR(SaleItem.createdAt), '-Q', QUARTER(SaleItem.createdAt))" : (groupBy === 'yearly' ? "YEAR(SaleItem.createdAt)" : (groupBy === 'daily' ? "DATE_FORMAT(SaleItem.createdAt, '%Y-%m-%d')" : "DATE_FORMAT(SaleItem.createdAt, '%Y-%m')"))))],
      order: [[sequelize.literal('period'), 'ASC']],
      raw: true
    });

    // 2. Gap filling
    const generateTimeline = (startStr, endStr, mode) => {
      const list = [];
      let current = new Date(startStr);
      const end = new Date(endStr);
      
      const formatDate = (d) => d.toISOString().substring(0, 10);
      const formatMonth = (d) => d.toISOString().substring(0, 7);
      const formatYear = (d) => String(d.getFullYear());
      const formatQuarter = (d) => `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
      const formatWeek = (d) => {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(d.setDate(diff));
        return mon.toISOString().substring(0, 10);
      };

      if (mode === 'daily') {
        while (current <= end) {
          list.push(formatDate(current));
          current.setDate(current.getDate() + 1);
        }
      } else if (mode === 'weekly') {
        let firstWeekMon = new Date(formatWeek(current));
        while (firstWeekMon <= end) {
          list.push(formatDate(firstWeekMon));
          firstWeekMon.setDate(firstWeekMon.getDate() + 7);
        }
      } else if (mode === 'monthly') {
        while (formatMonth(current) <= formatMonth(end)) {
          list.push(formatMonth(current));
          current.setMonth(current.getMonth() + 1);
        }
      } else if (mode === 'quarterly') {
        while (formatQuarter(current) <= formatQuarter(end)) {
          list.push(formatQuarter(current));
          current.setMonth(current.getMonth() + 3);
        }
      } else if (mode === 'yearly') {
        while (formatYear(current) <= formatYear(end)) {
          list.push(formatYear(current));
          current.setFullYear(current.getFullYear() + 1);
        }
      }
      return Array.from(new Set(list));
    };

    const timeline = generateTimeline(computedStart, computedEnd, groupBy);

    const salesMap = {};
    rawSales.forEach(s => {
      if (s.period) {
        salesMap[String(s.period)] = {
          revenue: parseFloat(s.revenue) || 0,
          transactions: parseInt(s.transactions) || 0
        };
      }
    });

    const invMap = {};
    rawInventory.forEach(i => {
      if (i.period) {
        invMap[String(i.period)] = parseFloat(i.quantitySold) || 0;
      }
    });

    let preparedData = timeline.map(p => ({
      month: p,
      revenue: salesMap[p]?.revenue || 0,
      transactions: salesMap[p]?.transactions || 0,
      quantitySold: invMap[p] || 0
    }));

    // 3. Outlier and Anomaly detection (2.5 std dev)
    if (preparedData.length > 2) {
      const revenues = preparedData.map(d => d.revenue);
      const meanRev = revenues.reduce((a, b) => a + b, 0) / revenues.length;
      const varianceRev = revenues.reduce((a, b) => a + Math.pow(b - meanRev, 2), 0) / revenues.length;
      const stdDevRev = Math.sqrt(varianceRev);

      if (stdDevRev > 0) {
        preparedData = preparedData.map(d => {
          const zScore = Math.abs(d.revenue - meanRev) / stdDevRev;
          if (zScore > 2.5) {
            return {
              ...d,
              revenue: parseFloat(meanRev.toFixed(2)),
              isAnomaly: true
            };
          }
          return d;
        });
      }
    }

    // 4. Linear Regression function
    const calculateRegression = (dataArray, key) => {
      const n = dataArray.length;
      if (n <= 1) {
        return {
          slope: 0,
          intercept: n === 1 ? parseFloat(dataArray[0][key]) || 0 : 0
        };
      }
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      dataArray.forEach((t, i) => {
        const x = i + 1;
        const y = parseFloat(t[key]) || 0;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      });
      const denominator = n * sumXX - sumX * sumX;
      const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
      const intercept = (sumY - slope * sumX) / n;
      return { slope, intercept };
    };

    // 5. Validation Split
    let mae = 0, rmse = 0, accuracy = 100.0, confidence = "High";
    if (preparedData.length >= 3) {
      const splitIdx = Math.round(preparedData.length * 0.8);
      const trainSet = preparedData.slice(0, splitIdx);
      const testSet = preparedData.slice(splitIdx);
      if (testSet.length > 0) {
        const testReg = calculateRegression(trainSet, 'revenue');
        let errorSum = 0, squaredErrorSum = 0, actualSum = 0;
        testSet.forEach((t, i) => {
          const xIndex = trainSet.length + i + 1;
          const predicted = Math.max(0, testReg.slope * xIndex + testReg.intercept);
          errorSum += Math.abs(t.revenue - predicted);
          squaredErrorSum += Math.pow(t.revenue - predicted, 2);
          actualSum += t.revenue;
        });
        mae = parseFloat((errorSum / testSet.length).toFixed(2));
        rmse = parseFloat(Math.sqrt(squaredErrorSum / testSet.length).toFixed(2));
        const meanActual = actualSum / testSet.length;
        accuracy = meanActual > 0 ? parseFloat((Math.max(0, 1 - (mae / meanActual)) * 100).toFixed(1)) : 100.0;
        confidence = accuracy < 70 ? "Low" : (accuracy <= 85 ? "Medium" : "High");
      }
    }

    // 6. Train final model on 100% data
    const finalRevReg = calculateRegression(preparedData, 'revenue');
    const finalDemReg = calculateRegression(preparedData, 'transactions');
    const finalInvReg = calculateRegression(preparedData, 'quantitySold');

    const lastMonthStr = preparedData.length > 0 ? preparedData[preparedData.length - 1].month : computedEnd;

    // Projection size based on horizon config
    let horizonSteps = 3;
    if (horizon === '7d') horizonSteps = 7;
    else if (horizon === '30d') horizonSteps = 30;
    else if (horizon === '3m') horizonSteps = 3;
    else if (horizon === '6m') horizonSteps = 6;
    else if (horizon === '1y') {
      if (groupBy === 'daily') horizonSteps = 365;
      else if (groupBy === 'weekly') horizonSteps = 52;
      else if (groupBy === 'monthly') horizonSteps = 12;
      else if (groupBy === 'quarterly') horizonSteps = 4;
      else if (groupBy === 'yearly') horizonSteps = 1;
    }

    const projections = [];
    for (let s = 1; s <= horizonSteps; s++) {
      const xIdx = preparedData.length + s;
      
      let predRev = finalRevReg.slope * xIdx + finalRevReg.intercept;
      if (predRev < 0) predRev = 0;

      let predDem = finalDemReg.slope * xIdx + finalDemReg.intercept;
      if (predDem < 0) predDem = 0;

      let predInv = finalInvReg.slope * xIdx + finalInvReg.intercept;
      if (predInv < 0) predInv = 0;

      projections.push({
        month: getNextPeriod(lastMonthStr, s, groupBy),
        predictedRevenue: parseFloat(predRev.toFixed(2)),
        predictedDemand: Math.round(predDem),
        predictedInventory: Math.round(predInv)
      });
    }

    const accuracyComparison = preparedData.map((d, i) => {
      const predictedVal = Math.max(0, finalRevReg.slope * (i + 1) + finalRevReg.intercept);
      return {
        month: d.month,
        actual: d.revenue,
        predicted: parseFloat(predictedVal.toFixed(2))
      };
    });

    const tableData = preparedData.map((d, i) => {
      const predictedVal = Math.max(0, finalRevReg.slope * (i + 1) + finalRevReg.intercept);
      return {
        period: d.month,
        actual: d.revenue,
        predicted: parseFloat(predictedVal.toFixed(2)),
        variance: parseFloat((d.revenue - predictedVal).toFixed(2))
      };
    });

    projections.forEach(p => {
      tableData.push({
        period: p.month,
        actual: null,
        predicted: p.predictedRevenue,
        variance: 0
      });
    });

    // 7. Branch Comparison ranking
    const { Branch } = require('../models');
    const branches = await Branch.findAll({ attributes: ['id', 'name'] });
    const branchForecasts = [];

    for (const b of branches) {
      const bSales = await Sale.findAll({
        where: { 
          branchId: b.id, 
          status: 'completed',
          createdAt: {
            [Op.between]: [
              new Date(computedStart),
              new Date(new Date(computedEnd).setHours(23, 59, 59, 999))
            ]
          }
        },
        attributes: [
          [groupField, 'period'],
          [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue']
        ],
        group: [groupField],
        raw: true
      });

      const bReg = calculateRegression(bSales, 'revenue');
      const bNextVal = Math.max(0, bReg.slope * (bSales.length + 1) + bReg.intercept);
      branchForecasts.push({
        branchName: b.name,
        predictedSales: parseFloat(bNextVal.toFixed(2))
      });
    }

    branchForecasts.sort((a, b) => b.predictedSales - a.predictedSales);

    // 8. Generate dynamic insights
    const nextMonthProj = projections[0] || { predictedRevenue: 0, predictedInventory: 0, predictedDemand: 0 };
    const lastMonthRev = preparedData.length > 0 ? preparedData[preparedData.length - 1].revenue : 0;
    const growthPercent = lastMonthRev !== 0 ? ((nextMonthProj.predictedRevenue - lastMonthRev) / lastMonthRev) * 100 : 0;

    const insights = [];
    if (growthPercent > 0) {
      insights.push(`Sales are predicted to increase by ${Math.abs(growthPercent).toFixed(1)}% next period.`);
    } else if (growthPercent < 0) {
      insights.push(`Sales are predicted to contract by ${Math.abs(growthPercent).toFixed(1)}% next period.`);
    } else {
      insights.push(`Sales are predicted to remain stable.`);
    }

    const { Inventory } = require('../models');
    const totalInventoryCount = await Inventory.sum('quantity') || 0;
    if (nextMonthProj.predictedInventory > totalInventoryCount) {
      insights.push(`Inventory may become insufficient. Projected demand (${nextMonthProj.predictedInventory} units) exceeds total stock count (${totalInventoryCount} units).`);
    }

    if (branchForecasts.length > 0) {
      insights.push(`Branch '${branchForecasts[0].branchName}' is expected to outperform with the highest predicted sales.`);
    }

    const currentDemand = preparedData.length > 0 ? preparedData[preparedData.length - 1].transactions : 0;
    if (nextMonthProj.predictedDemand > currentDemand) {
      insights.push(`Demand is expected to peak next period with ${nextMonthProj.predictedDemand} projected transactions.`);
    }

    res.json({
      mae,
      rmse,
      accuracy,
      confidence,
      predictedSales: nextMonthProj.predictedRevenue,
      predictedInventoryUsage: nextMonthProj.predictedInventory,
      predictedDemand: nextMonthProj.predictedDemand,
      growthPercentage: growthPercent,
      trends: preparedData,
      projections,
      tableData,
      branchRankings: branchForecasts,
      accuracyComparison,
      insights
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPrescriptiveAnalytics = async (req, res) => {
  try {
    const branchId = req.query.branchId;
    const where = {};
    if (branchId) where.branchId = branchId;

    const { Inventory, Product, Branch } = require('../models');

    const lowStockItems = await Inventory.findAll({
      where: {
        quantity: { [Op.lte]: sequelize.col('low_stock_threshold') }
      },
      include: [Product, Branch],
      limit: 10
    });

    const overstockItems = await Inventory.findAll({
      where: {
        quantity: { [Op.gt]: sequelize.literal('low_stock_threshold * 4') }
      },
      include: [Product, Branch],
      limit: 10
    });

    const actionsTable = [];

    lowStockItems.forEach(item => {
      actionsTable.push({
        issue: `Low Stock: ${item.Product?.name || 'Product'} (${item.quantity} units left) at ${item.Branch?.name || 'Branch'}`,
        recommendation: `Increase stock buffer for ${item.Product?.name || 'product'} by submitting restock request for ${Math.max(20, item.low_stock_threshold * 3)} units.`,
        expectedImpact: 'Prevent sales stockouts and satisfy immediate demand.',
        priority: 'High',
        why: 'Replenishment threshold reached with sales activity ongoing.',
        metrics: `Current: ${item.quantity} | Threshold: ${item.low_stock_threshold}`,
        confidence: 90
      });
    });

    overstockItems.forEach(item => {
      actionsTable.push({
        issue: `Overstock: ${item.Product?.name || 'Product'} (${item.quantity} units) at ${item.Branch?.name || 'Branch'}`,
        recommendation: 'Reduce purchasing frequency, run promotions or bundle with high-performing items.',
        expectedImpact: 'Reduce inventory holding fees and release tied capital.',
        priority: 'Medium',
        why: 'Available units are 4 times higher than standard safety stock thresholds.',
        metrics: `Current: ${item.quantity} | Buffer: ${item.low_stock_threshold}`,
        confidence: 85
      });
    });

    if (actionsTable.length === 0) {
      actionsTable.push({
        issue: 'Optimal Inventory Levels',
        recommendation: 'No action required. Buffer stock levels are healthy across sectors.',
        expectedImpact: 'None',
        priority: 'Low',
        why: 'Zero items matched threshold alerts.',
        metrics: 'All items within normal margins',
        confidence: 95
      });
    }

    res.json({
      actionsTable
    });

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
  getCustomerAnalytics,
  getForecastingAnalytics,
  getPrescriptiveAnalytics
};
