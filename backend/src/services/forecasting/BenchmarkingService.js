const { Op } = require('sequelize');
const sequelize = require('../../db');
const { Sale, SaleItem, Product, Branch, Category, BenchmarkRun, BenchmarkResult } = require('../../models');
const { getAvailableModels } = require('./models');
const BacktestingEngine = require('./BacktestingEngine');

// In-memory cache with 10-minute TTL
const benchmarkCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Generate gap-filled timeline buckets
 */
function generateTimelineBuckets(startStr, endStr, frequency = 'monthly') {
  const list = [];
  let current = new Date(startStr);
  const end = new Date(endStr);

  const formatDate = d => d.toISOString().substring(0, 10);
  const formatMonth = d => d.toISOString().substring(0, 7);
  const formatWeek = d => {
    const temp = new Date(d);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
    temp.setDate(diff);
    return temp.toISOString().substring(0, 10);
  };

  if (frequency === 'daily') {
    while (current <= end) {
      list.push(formatDate(current));
      current.setDate(current.getDate() + 1);
    }
  } else if (frequency === 'weekly') {
    let mon = new Date(formatWeek(current));
    while (mon <= end) {
      list.push(formatDate(mon));
      mon.setDate(mon.getDate() + 7);
    }
  } else {
    // monthly default
    while (formatMonth(current) <= formatMonth(end)) {
      list.push(formatMonth(current));
      current.setMonth(current.getMonth() + 1);
    }
  }

  return Array.from(new Set(list));
}

class BenchmarkingService {
  constructor() {
    this.engine = new BacktestingEngine({ minTrainPoints: 4 });
  }

  /**
   * Run benchmark evaluation
   */
  async runBenchmark(params = {}) {
    const {
      scopeType = 'all',
      scopeId = null,
      branchId = null,
      categoryId = null,
      productId = null,
      startDate,
      endDate,
      frequency = 'monthly',
      horizon = '30d',
      metric = 'revenue', // 'revenue' or 'quantity'
      userId = null,
      forceRefresh = false,
    } = params;

    // Build cache key
    const effectiveBranchId = branchId || (scopeType === 'branch' ? scopeId : null);
    const effectiveCategoryId = categoryId || (scopeType === 'category' ? scopeId : null);
    const effectiveProductId = productId || (scopeType === 'product' ? scopeId : null);

    const cacheKey = JSON.stringify({
      scopeType,
      effectiveBranchId,
      effectiveCategoryId,
      effectiveProductId,
      startDate,
      endDate,
      frequency,
      metric,
    });

    if (!forceRefresh && benchmarkCache.has(cacheKey)) {
      const cached = benchmarkCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return { ...cached.data, fromCache: true };
      }
      benchmarkCache.delete(cacheKey);
    }

    // Resolve date boundaries
    let computedStart = startDate;
    let computedEnd = endDate;
    if (!computedStart || !computedEnd) {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 12);
      computedStart = start.toISOString().substring(0, 10);
      computedEnd = end.toISOString().substring(0, 10);
    }

    // Build SQL condition & grouping
    let groupExpr = "DATE_FORMAT(s.createdAt, '%Y-%m')";
    if (frequency === 'daily') {
      groupExpr = "DATE_FORMAT(s.createdAt, '%Y-%m-%d')";
    } else if (frequency === 'weekly') {
      groupExpr = "DATE_FORMAT(DATE_SUB(s.createdAt, INTERVAL WEEKDAY(s.createdAt) DAY), '%Y-%m-%d')";
    }

    let whereClause = "WHERE s.status = 'completed'";
    const replacements = [];

    whereClause += " AND s.createdAt BETWEEN ? AND ?";
    replacements.push(
      new Date(computedStart),
      new Date(new Date(computedEnd).setHours(23, 59, 59, 999))
    );

    if (effectiveBranchId && effectiveBranchId !== 'all') {
      whereClause += " AND s.branchId = ?";
      replacements.push(effectiveBranchId);
    }

    if (effectiveCategoryId && effectiveCategoryId !== 'all') {
      whereClause += " AND p.categoryId = ?";
      replacements.push(effectiveCategoryId);
    }

    if (effectiveProductId && effectiveProductId !== 'all') {
      whereClause += " AND si.productId = ?";
      replacements.push(effectiveProductId);
    }

    // Execute aggregate query
    const rawSales = await sequelize.query(`
      SELECT 
        ${groupExpr} AS period,
        COALESCE(SUM(si.quantity * si.unitPrice), SUM(s.totalAmount), 0) AS revenue,
        COALESCE(SUM(si.quantity), 0) AS units,
        COUNT(DISTINCT s.id) AS transactions
      FROM sales s
      LEFT JOIN saleitems si ON si.saleId = s.id
      LEFT JOIN products p ON p.id = si.productId
      ${whereClause}
      GROUP BY ${groupExpr}
      ORDER BY period ASC
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    // Generate gap-filled timeline
    const timelineBuckets = generateTimelineBuckets(computedStart, computedEnd, frequency);
    const salesMap = {};
    rawSales.forEach(row => {
      if (row.period) {
        salesMap[String(row.period)] = {
          revenue: parseFloat(row.revenue) || 0,
          units: parseFloat(row.units) || 0,
          transactions: parseInt(row.transactions) || 0,
        };
      }
    });

    const series = timelineBuckets.map(period => ({
      period,
      value: metric === 'quantity' ? (salesMap[period]?.units || 0) : (salesMap[period]?.revenue || 0),
      revenue: salesMap[period]?.revenue || 0,
      units: salesMap[period]?.units || 0,
      transactions: salesMap[period]?.transactions || 0,
    }));

    // Check data sufficiency guard
    if (series.length < 4) {
      const insufficiencyResult = {
        hasSufficientData: false,
        scopeType,
        scopeId: effectiveBranchId || effectiveCategoryId || effectiveProductId || null,
        startDate: computedStart,
        endDate: computedEnd,
        frequency,
        metric,
        totalPoints: series.length,
        minRequired: 4,
        message: `Insufficient historical sales data (${series.length} periods found). At least 4 chronological periods are required for rigorous rolling-origin backtesting.`,
        models: [],
        timeline: [],
        bestModel: null,
      };

      // Record in benchmark_runs as insufficient_data
      try {
        await BenchmarkRun.create({
          scope_type: scopeType,
          scope_id: effectiveBranchId || effectiveCategoryId || effectiveProductId || null,
          branch_id: effectiveBranchId && effectiveBranchId !== 'all' ? effectiveBranchId : null,
          start_date: computedStart,
          end_date: computedEnd,
          frequency,
          horizon,
          validation_method: 'walk_forward',
          validation_windows: 0,
          status: 'insufficient_data',
          reliability: 'Low',
          recommendation_notes: insufficiencyResult.message,
          created_by: userId,
        });
      } catch (dbErr) {
        console.warn('[BenchmarkingService] Failed to save insufficient run record:', dbErr.message);
      }

      return insufficiencyResult;
    }

    // Instantiate all candidate models
    const models = getAvailableModels({ frequency });

    // Execute rolling-origin validation via BacktestingEngine
    const backtestResult = this.engine.evaluate(models, series);

    // Calculate lift against baseline Naive model
    const naiveModel = backtestResult.models.find(m => m.modelId === 'naive');
    const bestModel = backtestResult.models.find(m => m.rank === 1);

    let liftVsNaivePercent = null;
    if (naiveModel && bestModel && naiveModel.wape && bestModel.wape && naiveModel.wape > 0) {
      liftVsNaivePercent = parseFloat((((naiveModel.wape - bestModel.wape) / naiveModel.wape) * 100).toFixed(1));
    }

    // Generate recommendation narrative
    let recommendationReason = 'Model demonstrates the lowest prediction error and stable bias over rolling validation.';
    if (bestModel) {
      if (bestModel.modelId === 'holt_linear') {
        recommendationReason = `Holt's Linear Trend achieved the lowest WAPE (${bestModel.wape}%) by effectively capturing ongoing momentum and trends while dampening volatility.`;
      } else if (bestModel.modelId === 'exponential_smoothing') {
        recommendationReason = `Simple Exponential Smoothing performed best (WAPE: ${bestModel.wape}%), prioritizing recent demand patterns while stabilizing erratic fluctuations.`;
      } else if (bestModel.modelId === 'linear_regression') {
        recommendationReason = `Linear Regression achieved lowest WAPE (${bestModel.wape}%), fitting overall business trajectories with minimal residual drift.`;
      } else if (bestModel.modelId === 'moving_average') {
        recommendationReason = `Moving Average achieved lowest WAPE (${bestModel.wape}%), filtering out short-term noise reliably.`;
      } else if (bestModel.modelId === 'seasonal_naive') {
        recommendationReason = `Seasonal Naive outperformed other models (WAPE: ${bestModel.wape}%), successfully leveraging repetitive seasonal cycles.`;
      } else {
        recommendationReason = `Naive baseline proved most resilient (WAPE: ${bestModel.wape}%) given low sample variance.`;
      }
    }

    // Product-level breakdown for top products in scope
    const topProducts = await Product.findAll({
      where: { deleted_at: null },
      attributes: ['id', 'name', 'sku', 'price'],
      limit: 15,
      raw: true
    });

    const productBreakdown = [];
    for (const prod of topProducts) {
      const prodRows = await sequelize.query(`
        SELECT 
          ${groupExpr} AS period,
          COALESCE(SUM(si.quantity), 0) AS units,
          COALESCE(SUM(si.quantity * si.unitPrice), 0) AS revenue
        FROM saleitems si
        INNER JOIN sales s ON si.saleId = s.id
        WHERE s.status = 'completed' AND si.productId = ?
          ${effectiveBranchId && effectiveBranchId !== 'all' ? ' AND s.branchId = ?' : ''}
          AND s.createdAt BETWEEN ? AND ?
        GROUP BY ${groupExpr}
        ORDER BY period ASC
      `, {
        replacements: effectiveBranchId && effectiveBranchId !== 'all'
          ? [prod.id, effectiveBranchId, new Date(computedStart), new Date(new Date(computedEnd).setHours(23, 59, 59, 999))]
          : [prod.id, new Date(computedStart), new Date(new Date(computedEnd).setHours(23, 59, 59, 999))],
        type: sequelize.QueryTypes.SELECT
      });

      if (prodRows.length >= 4) {
        const prodMap = {};
        prodRows.forEach(r => { prodMap[r.period] = parseFloat(r.revenue) || 0; });
        const prodSeries = timelineBuckets.map(p => ({ period: p, value: prodMap[p] || 0 }));
        
        // Fast evaluation with top models
        const prodModels = [models[0], models[1], models[2]];
        const pEngine = new BacktestingEngine({ minTrainPoints: 3 });
        const pEval = pEngine.evaluate(prodModels, prodSeries);
        const pBest = pEval.models.find(m => m.rank === 1);

        productBreakdown.push({
          productId: prod.id,
          name: prod.name,
          sku: prod.sku,
          totalRevenue: prodRows.reduce((a, r) => a + (parseFloat(r.revenue) || 0), 0),
          totalUnits: prodRows.reduce((a, r) => a + (parseFloat(r.units) || 0), 0),
          bestModelName: pBest ? pBest.modelName : 'N/A',
          bestWape: pBest ? pBest.wape : null,
          mae: pBest ? pBest.mae : null,
          reliability: pBest ? pBest.reliability : 'Low',
        });
      }
    }

    productBreakdown.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Database Persistence
    let savedRunId = null;
    try {
      const runRecord = await BenchmarkRun.create({
        scope_type: scopeType,
        scope_id: effectiveBranchId || effectiveCategoryId || effectiveProductId || null,
        branch_id: effectiveBranchId && effectiveBranchId !== 'all' ? effectiveBranchId : null,
        start_date: computedStart,
        end_date: computedEnd,
        frequency,
        horizon,
        validation_method: 'walk_forward',
        validation_windows: backtestResult.validationPoints || 0,
        status: 'completed',
        best_model: bestModel ? bestModel.modelName : null,
        best_wape: bestModel ? bestModel.wape : null,
        best_mae: bestModel ? bestModel.mae : null,
        best_rmse: bestModel ? bestModel.rmse : null,
        best_bias: bestModel ? bestModel.bias : null,
        reliability: bestModel ? bestModel.reliability : 'Moderate',
        recommendation_notes: recommendationReason,
        created_by: userId,
      });

      savedRunId = runRecord.id;

      // Save individual candidate model results
      const resultInserts = backtestResult.models.map(m => ({
        benchmark_run_id: savedRunId,
        model_id: m.modelId,
        model_name: m.modelName,
        model_version: m.version || 'v1.0',
        mae: m.mae || 0.0,
        rmse: m.rmse || 0.0,
        mape: m.mape || 0.0,
        wape: m.wape || 0.0,
        bias: m.bias || 0.0,
        accuracy: m.wape !== null ? Math.max(0, 100 - m.wape) : null,
        reliability: m.reliability || 'Low',
        rank: m.rank || 99,
        validation_windows: m.testedSteps || 0,
        status: m.applicable ? 'evaluated' : 'ineligible',
        failure_reason: m.ineligibilityReason || null,
      }));

      await BenchmarkResult.bulkCreate(resultInserts);
    } catch (saveErr) {
      console.warn('[BenchmarkingService] Persistence error:', saveErr.message);
    }

    const primaryBest = bestModel || backtestResult.models[0];
    const overallMetrics = primaryBest ? {
      mae: primaryBest.mae,
      rmse: primaryBest.rmse,
      mape: primaryBest.mape,
      wape: primaryBest.wape,
      accuracy: primaryBest.wape !== null ? parseFloat(Math.max(0, 100 - primaryBest.wape).toFixed(1)) : 0,
      performance: primaryBest.reliability,
      bias: primaryBest.bias,
    } : null;

    const finalResponse = {
      runId: savedRunId,
      hasSufficientData: true,
      scopeType,
      scopeId: effectiveBranchId || effectiveCategoryId || effectiveProductId || null,
      startDate: computedStart,
      endDate: computedEnd,
      frequency,
      horizon,
      metric,
      totalObservations: series.length,
      trainObservations: backtestResult.trainPoints,
      validationWindows: backtestResult.validationPoints,
      overallMetrics,
      bestModel: bestModel ? {
        ...bestModel,
        recommendationReason,
        liftVsNaivePercent,
      } : null,
      models: backtestResult.models,
      modelsComparison: backtestResult.models,
      timeline: backtestResult.timeline,
      productBreakdown,
      evaluatedAt: backtestResult.evaluatedAt,
    };

    // Cache the result
    benchmarkCache.set(cacheKey, { timestamp: Date.now(), data: finalResponse });

    return finalResponse;
  }

  /**
   * Retrieve historical benchmark runs
   */
  async getBenchmarkHistory(query = {}) {
    const { limit = 20, offset = 0, scopeType, branchId } = query;
    const where = {};
    if (scopeType && scopeType !== 'all') {
      where.scope_type = scopeType;
    }
    if (branchId && branchId !== 'all') {
      where.branch_id = branchId;
    }

    const { rows, count } = await BenchmarkRun.findAndCountAll({
      where,
      limit: parseInt(limit, 10) || 20,
      offset: parseInt(offset, 10) || 0,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: BenchmarkResult,
          as: 'results',
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name'],
        },
      ],
    });

    return { total: count, runs: rows };
  }

  /**
   * Get latest benchmark recommendation for integration into other views
   */
  async getLatestRecommendation(scope = {}) {
    const { branchId = null } = scope;
    const where = { status: 'completed' };
    if (branchId && branchId !== 'all') {
      where.branch_id = branchId;
    }

    const latest = await BenchmarkRun.findOne({
      where,
      order: [['createdAt', 'DESC']],
      include: [{ model: BenchmarkResult, as: 'results' }],
    });

    return latest;
  }
}

module.exports = new BenchmarkingService();
