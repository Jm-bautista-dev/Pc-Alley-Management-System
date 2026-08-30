const { Op } = require('sequelize');
const sequelize = require('../db');
const { Sale, SaleItem, Product, Branch } = require('../models');

/**
 * Helper to generate time buckets for timeline gap-filling
 */
const generateTimeline = (startStr, endStr, mode) => {
  const list = [];
  let current = new Date(startStr);
  const end = new Date(endStr);

  const formatDate = (d) => d.toISOString().substring(0, 10);
  const formatMonth = (d) => d.toISOString().substring(0, 7);
  const formatYear = (d) => String(d.getFullYear());
  const formatQuarter = (d) => `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  const formatWeek = (d) => {
    const temp = new Date(d);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
    temp.setDate(diff);
    return temp.toISOString().substring(0, 10);
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

/**
 * Mathematical Models
 */

// 1. Linear Regression (Trend Model)
const forecastLinearRegression = (history) => {
  const n = history.length;
  if (n === 0) return 0;
  if (n === 1) return history[0].value;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  history.forEach((pt, i) => {
    const x = i + 1;
    const y = pt.value;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  const denom = n * sumXX - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  const nextX = n + 1;
  const prediction = slope * nextX + intercept;
  return Math.max(0, prediction);
};

// 2. Simple Moving Average (SMA, window k = 3 or dynamic)
const forecastMovingAverage = (history, windowSize = 3) => {
  const n = history.length;
  if (n === 0) return 0;
  const k = Math.min(windowSize, n);
  const slice = history.slice(n - k);
  const sum = slice.reduce((acc, pt) => acc + pt.value, 0);
  return Math.max(0, sum / k);
};

// 3. Exponential Smoothing (SES with alpha = 0.4 or Holt's trend)
const forecastExponentialSmoothing = (history, alpha = 0.4, beta = 0.2) => {
  const n = history.length;
  if (n === 0) return 0;
  if (n === 1) return history[0].value;

  let level = history[0].value;
  let trend = history[1].value - history[0].value;

  for (let i = 1; i < n; i++) {
    const val = history[i].value;
    const prevLevel = level;
    level = alpha * val + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  const prediction = level + trend;
  return Math.max(0, prediction);
};

// Model Dispatcher
const predictNextPeriod = (history, modelType) => {
  switch (modelType) {
    case 'moving_average':
      return forecastMovingAverage(history);
    case 'exponential_smoothing':
      return forecastExponentialSmoothing(history);
    case 'linear_regression':
    default:
      return forecastLinearRegression(history);
  }
};

/**
 * Statistical Accuracy Metrics Calculator
 */
const calculateMetrics = (observations) => {
  const n = observations.length;
  if (n === 0) {
    return {
      mae: 0,
      rmse: 0,
      mape: 0,
      wape: 0,
      r2: null,
      accuracy: 0,
      performance: 'Insufficient Data',
      validCount: 0,
      zeroCount: 0
    };
  }

  let sumAbsError = 0;
  let sumSqError = 0;
  let sumActual = 0;
  let sumMapeTerms = 0;
  let validMapeCount = 0;
  let zeroCount = 0;

  observations.forEach(obs => {
    const error = obs.predicted - obs.actual;
    const absError = Math.abs(error);
    const sqError = Math.pow(error, 2);

    sumAbsError += absError;
    sumSqError += sqError;
    sumActual += obs.actual;

    if (obs.actual > 0) {
      sumMapeTerms += (absError / obs.actual);
      validMapeCount++;
    } else {
      zeroCount++;
    }
  });

  const mae = parseFloat((sumAbsError / n).toFixed(2));
  const rmse = parseFloat(Math.sqrt(sumSqError / n).toFixed(2));

  // MAPE calculation handling zero actuals safely
  const mape = validMapeCount > 0
    ? parseFloat(((sumMapeTerms / validMapeCount) * 100).toFixed(2))
    : 0;

  // WAPE (Weighted Absolute Percentage Error: sum(|e|) / sum(actual))
  const wape = sumActual > 0
    ? parseFloat(((sumAbsError / sumActual) * 100).toFixed(2))
    : 0;

  // R² (Coefficient of Determination)
  const meanActual = sumActual / n;
  let totalSumSquares = 0;
  observations.forEach(obs => {
    totalSumSquares += Math.pow(obs.actual - meanActual, 2);
  });

  let r2 = null;
  if (totalSumSquares > 0.0001 && n >= 2) {
    const rawR2 = 1 - (sumSqError / totalSumSquares);
    r2 = parseFloat(Math.max(-1, Math.min(1, rawR2)).toFixed(3));
  }

  // Accuracy Score (bounded 0 to 100%)
  const primaryErrorPct = validMapeCount > 0 ? (sumActual > 0 ? (wape * 0.5 + mape * 0.5) : mape) : wape;
  const accuracy = parseFloat(Math.max(0, Math.min(100, 100 - primaryErrorPct)).toFixed(1));

  // Qualitative Performance Rating
  let performance = 'Needs Improvement';
  if (primaryErrorPct <= 10) {
    performance = 'Excellent';
  } else if (primaryErrorPct <= 20) {
    performance = 'Good';
  } else if (primaryErrorPct <= 30) {
    performance = 'Fair';
  } else {
    performance = 'Needs Improvement';
  }

  return {
    mae,
    rmse,
    mape,
    wape,
    r2,
    accuracy,
    performance,
    validCount: n,
    zeroCount
  };
};

/**
 * Main Benchmarking Function
 * Performs rolling-origin backtesting across historical periods without data leakage.
 */
const runModelBenchmark = async ({
  startDate,
  endDate,
  branchId,
  productId,
  groupBy = 'monthly',
  minTrainingPoints = 3
}) => {
  // 1. Resolve date window
  let computedStart = startDate;
  let computedEnd = endDate;

  if (!computedStart || !computedEnd) {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 12);
    computedStart = start.toISOString().substring(0, 10);
    computedEnd = end.toISOString().substring(0, 10);
  }

  // 2. Build SQL conditions
  let saleWhere = "WHERE s.status = 'completed'";
  const replacements = [];

  if (branchId && branchId !== 'all') {
    saleWhere += " AND s.branchId = ?";
    replacements.push(branchId);
  }

  saleWhere += " AND s.createdAt BETWEEN ? AND ?";
  replacements.push(
    new Date(computedStart),
    new Date(new Date(computedEnd).setHours(23, 59, 59, 999))
  );

  let productFilter = "";
  if (productId && productId !== 'all') {
    productFilter = " AND si.productId = ?";
    replacements.push(productId);
  }

  // SQL date formatting based on granularity
  let groupExpr = "DATE_FORMAT(s.createdAt, '%Y-%m')";
  if (groupBy === 'daily') {
    groupExpr = "DATE_FORMAT(s.createdAt, '%Y-%m-%d')";
  } else if (groupBy === 'weekly') {
    groupExpr = "DATE_FORMAT(DATE_SUB(s.createdAt, INTERVAL WEEKDAY(s.createdAt) DAY), '%Y-%m-%d')";
  } else if (groupBy === 'quarterly') {
    groupExpr = "CONCAT(YEAR(s.createdAt), '-Q', QUARTER(s.createdAt))";
  } else if (groupBy === 'yearly') {
    groupExpr = "YEAR(s.createdAt)";
  }

  // 3. Query historical sales data
  const rawSales = await sequelize.query(`
    SELECT 
      ${groupExpr} AS period,
      COALESCE(SUM(si.quantity * si.unitPrice), SUM(s.totalAmount), 0) AS revenue,
      COALESCE(SUM(si.quantity), 0) AS units,
      COUNT(DISTINCT s.id) AS transactions
    FROM sales s
    LEFT JOIN saleitems si ON si.saleId = s.id
    ${saleWhere} ${productFilter}
    GROUP BY ${groupExpr}
    ORDER BY period ASC
  `, {
    replacements,
    type: sequelize.QueryTypes.SELECT
  });

  // 4. Build complete gap-filled timeline
  const timeline = generateTimeline(computedStart, computedEnd, groupBy);
  const salesMap = {};
  rawSales.forEach(row => {
    if (row.period) {
      salesMap[String(row.period)] = {
        revenue: parseFloat(row.revenue) || 0,
        units: parseFloat(row.units) || 0,
        transactions: parseInt(row.transactions) || 0
      };
    }
  });

  const fullTimeSeries = timeline.map(period => ({
    period,
    value: salesMap[period]?.revenue || 0,
    units: salesMap[period]?.units || 0,
    transactions: salesMap[period]?.transactions || 0
  }));

  // Check if we have enough points for backtesting
  if (fullTimeSeries.length < minTrainingPoints + 1) {
    return {
      hasSufficientData: false,
      message: `Insufficient historical data to perform a reliable benchmark. Found ${fullTimeSeries.length} observation periods (minimum required: ${minTrainingPoints + 1} periods).`,
      timeSeriesLength: fullTimeSeries.length,
      requiredLength: minTrainingPoints + 1,
      overallMetrics: calculateMetrics([]),
      modelsComparison: [],
      productBenchmarks: [],
      backtestHistory: [],
      recommendedModel: null
    };
  }

  // 5. Run Rolling-Origin Backtesting for each model
  // Model types to benchmark
  const candidateModels = [
    { id: 'linear_regression', name: 'Linear Regression (Trend Model)' },
    { id: 'moving_average', name: 'Simple Moving Average (SMA)' },
    { id: 'exponential_smoothing', name: 'Exponential Smoothing (Holt-Winters SES)' }
  ];

  const modelResults = {};
  candidateModels.forEach(m => {
    modelResults[m.id] = {
      id: m.id,
      name: m.name,
      observations: []
    };
  });

  // Rolling-origin evaluation loop (Zero Data Leakage: strictly train on history < t to predict t)
  for (let t = minTrainingPoints; t < fullTimeSeries.length; t++) {
    const historicalTrainSlice = fullTimeSeries.slice(0, t);
    const targetPeriod = fullTimeSeries[t];

    candidateModels.forEach(m => {
      const pred = predictNextPeriod(historicalTrainSlice, m.id);
      const roundedPred = parseFloat(pred.toFixed(2));
      const actualVal = targetPeriod.value;
      const error = parseFloat((roundedPred - actualVal).toFixed(2));
      const absError = Math.abs(error);
      const pctError = actualVal > 0 ? parseFloat(((absError / actualVal) * 100).toFixed(2)) : null;

      modelResults[m.id].observations.push({
        period: targetPeriod.period,
        actual: actualVal,
        predicted: roundedPred,
        error,
        absError,
        pctError
      });
    });
  }

  // Compute metrics for each model
  const modelsComparison = candidateModels.map(m => {
    const obs = modelResults[m.id].observations;
    const metrics = calculateMetrics(obs);
    return {
      id: m.id,
      name: m.name,
      ...metrics,
      sampleSize: obs.length
    };
  });

  // Sort candidate models by Lowest MAE and Highest Accuracy
  modelsComparison.sort((a, b) => {
    if (a.mae !== b.mae) return a.mae - b.mae;
    return b.accuracy - a.accuracy;
  });

  const bestModel = modelsComparison[0] || null;
  const primaryModelId = 'linear_regression';
  const primaryObservations = modelResults[primaryModelId]?.observations || [];
  const primaryMetrics = calculateMetrics(primaryObservations);

  // Recommendation reasoning
  let recommendationReason = 'Demonstrates the lowest average prediction error (MAE) and highest accuracy across historical backtesting periods.';
  if (bestModel) {
    if (bestModel.id === 'linear_regression') {
      recommendationReason = `Linear Regression performed best with MAE ₱${bestModel.mae.toLocaleString()} and ${bestModel.accuracy}% accuracy, capturing the overall sales trajectory most effectively.`;
    } else if (bestModel.id === 'exponential_smoothing') {
      recommendationReason = `Exponential Smoothing performed best with MAE ₱${bestModel.mae.toLocaleString()}, effectively adapting to recent velocity shifts without over-penalizing older data.`;
    } else if (bestModel.id === 'moving_average') {
      recommendationReason = `Moving Average achieved the lowest error (MAE ₱${bestModel.mae.toLocaleString()}) by smoothing out short-term fluctuations effectively.`;
    }
  }

  // 6. Product-Level Benchmarking Breakdown
  const products = await Product.findAll({
    where: { deleted_at: null },
    attributes: ['id', 'name', 'sku', 'price'],
    limit: 50,
    raw: true
  });

  const productBenchmarks = [];

  for (const prod of products) {
    const prodReplacements = [prod.id];
    let prodSaleWhere = "WHERE s.status = 'completed' AND si.productId = ?";

    if (branchId && branchId !== 'all') {
      prodSaleWhere += " AND s.branchId = ?";
      prodReplacements.push(branchId);
    }

    prodSaleWhere += " AND s.createdAt BETWEEN ? AND ?";
    prodReplacements.push(
      new Date(computedStart),
      new Date(new Date(computedEnd).setHours(23, 59, 59, 999))
    );

    const prodSales = await sequelize.query(`
      SELECT 
        ${groupExpr} AS period,
        COALESCE(SUM(si.quantity), 0) AS units,
        COALESCE(SUM(si.quantity * si.unitPrice), 0) AS revenue
      FROM saleitems si
      INNER JOIN sales s ON si.saleId = s.id
      ${prodSaleWhere}
      GROUP BY ${groupExpr}
      ORDER BY period ASC
    `, {
      replacements: prodReplacements,
      type: sequelize.QueryTypes.SELECT
    });

    if (prodSales.length >= 2) {
      const prodSalesMap = {};
      prodSales.forEach(r => {
        prodSalesMap[String(r.period)] = parseFloat(r.units) || 0;
      });

      const prodSeries = timeline.map(p => ({
        period: p,
        value: prodSalesMap[p] || 0
      }));

      // Rolling backtest for this product
      const prodObs = [];
      const prodMinPoints = Math.min(2, Math.max(1, Math.floor(prodSeries.length * 0.4)));

      for (let pt = prodMinPoints; pt < prodSeries.length; pt++) {
        const historySlice = prodSeries.slice(0, pt);
        const target = prodSeries[pt];
        const pred = predictNextPeriod(historySlice, 'linear_regression');
        const roundedPred = parseFloat(pred.toFixed(1));
        const actualVal = target.value;
        const err = parseFloat((roundedPred - actualVal).toFixed(1));

        prodObs.push({
          period: target.period,
          actual: actualVal,
          predicted: roundedPred,
          error: err,
          absError: Math.abs(err),
          pctError: actualVal > 0 ? parseFloat(((Math.abs(err) / actualVal) * 100).toFixed(1)) : null
        });
      }

      const pMetrics = calculateMetrics(prodObs);
      const totalUnits = prodSales.reduce((acc, r) => acc + (parseFloat(r.units) || 0), 0);

      productBenchmarks.push({
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        totalUnits,
        mae: pMetrics.mae,
        rmse: pMetrics.rmse,
        mape: pMetrics.mape,
        accuracy: pMetrics.accuracy,
        performance: pMetrics.performance,
        samplePeriods: prodObs.length
      });
    }
  }

  // Sort products by Accuracy / Volume
  productBenchmarks.sort((a, b) => b.totalUnits - a.totalUnits);

  // 7. Assemble Backtest Comparison Table
  const backtestHistory = primaryObservations.map(obs => ({
    period: obs.period,
    actual: obs.actual,
    predicted: obs.predicted,
    error: obs.error,
    absError: obs.absError,
    pctError: obs.pctError,
    residual: obs.error
  }));

  return {
    hasSufficientData: true,
    benchmarkPeriod: `${computedStart} to ${computedEnd}`,
    granularity: groupBy,
    evaluatedPeriodsCount: primaryObservations.length,
    overallMetrics: primaryMetrics,
    modelsComparison,
    bestModel: {
      ...bestModel,
      recommendationReason
    },
    backtestHistory,
    allModelObservations: modelResults,
    productBenchmarks
  };
};

module.exports = {
  runModelBenchmark,
  calculateMetrics
};
