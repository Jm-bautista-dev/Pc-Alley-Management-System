/**
 * BacktestingEngine
 * Implements walk-forward rolling-origin backtesting with zero future data leakage.
 */
class BacktestingEngine {
  /**
   * @param {Object} options
   * @param {number} options.minTrainPoints - Minimum training points required before beginning rolling origin (default: 4)
   * @param {number} options.testSteps - Number of rolling test steps or horizon (default: null, meaning up to 30% of data or at least 2)
   */
  constructor(options = {}) {
    this.minTrainPoints = options.minTrainPoints || 4;
    this.testSteps = options.testSteps || null;
  }

  /**
   * Run rolling-origin evaluation on an array of models over a historical series.
   * @param {Array<BaseForecastModel>} models - Candidate forecast models
   * @param {Array<{ period: string, value: number }>} series - Chronologically sorted data points
   * @param {Object} options
   */
  evaluate(models, series, options = {}) {
    if (!Array.isArray(series) || series.length < this.minTrainPoints) {
      return {
        hasSufficientData: false,
        totalPoints: series ? series.length : 0,
        minRequired: this.minTrainPoints,
        message: `Insufficient historical data (${series ? series.length : 0} points). At least ${this.minTrainPoints} historical points are required for backtesting validation.`,
        models: [],
        timeline: [],
      };
    }

    const N = series.length;
    // Determine test origin start:
    // We want at least minTrainPoints for training, and at least 2 points for evaluation if possible.
    let numTestSteps = this.testSteps;
    if (!numTestSteps || numTestSteps >= N) {
      // Default to 20%-30% of data for validation, min 2 steps, max 12 steps
      numTestSteps = Math.max(2, Math.min(12, Math.floor(N * 0.3)));
    }
    // Ensure train set has at least minTrainPoints
    if (N - numTestSteps < this.minTrainPoints) {
      numTestSteps = Math.max(1, N - this.minTrainPoints);
    }

    const testStartIndex = N - numTestSteps;

    // Structure to hold predictions for each model at each cutoff step
    // modelResults[modelId] = { model, predictions: [], errors: [], actuals: [] }
    const modelResults = {};
    for (const model of models) {
      modelResults[model.getId()] = {
        model,
        predictions: [],
        actuals: [],
        errors: [], // predicted - actual
        absoluteErrors: [],
        squaredErrors: [],
        percentageErrors: [],
        applicable: true,
        ineligibilityReason: null,
      };
    }

    // Timeline entries for charts: [{ period, actual, predictions: { modelId: val } }]
    const timeline = [];

    // Rolling-origin walk-forward validation:
    // At step t from testStartIndex to N - 1:
    // Train slice: series[0 ... t - 1] (length t)
    // Target: series[t]
    for (let t = testStartIndex; t < N; t++) {
      const trainData = series.slice(0, t);
      const targetPoint = series[t];
      const actualVal = typeof targetPoint.value === 'number' ? targetPoint.value : (targetPoint.revenue || 0);

      const timelineEntry = {
        period: targetPoint.period || `T+${t}`,
        actual: actualVal,
        predictions: {},
      };

      for (const model of models) {
        const res = modelResults[model.getId()];
        if (!res.applicable) continue;

        // Check if model has enough points
        if (trainData.length < model.getMinPoints()) {
          res.applicable = false;
          res.ineligibilityReason = `Requires at least ${model.getMinPoints()} points (available: ${trainData.length})`;
          continue;
        }

        try {
          // Clone train data to prevent any internal mutation
          const trainClone = trainData.map(d => ({ ...d }));
          model.train(trainClone);

          // Predict 1 step ahead (for the current target period t)
          const predVal = Math.max(0, parseFloat(model.predict(1).toFixed(2)));
          timelineEntry.predictions[model.getId()] = predVal;

          const error = predVal - actualVal;
          const absError = Math.abs(error);
          const sqError = Math.pow(error, 2);

          res.predictions.push(predVal);
          res.actuals.push(actualVal);
          res.errors.push(error);
          res.absoluteErrors.push(absError);
          res.squaredErrors.push(sqError);

          // Zero-safe percentage error calculation
          if (actualVal > 0) {
            res.percentageErrors.push((absError / actualVal) * 100);
          }
        } catch (err) {
          console.warn(`[BacktestingEngine] Model ${model.getName()} error at step ${t}:`, err.message);
          res.applicable = false;
          res.ineligibilityReason = err.message;
        }
      }

      timeline.push(timelineEntry);
    }

    // Compute aggregate metrics for each model
    const evaluatedModels = [];

    for (const model of models) {
      const res = modelResults[model.getId()];
      if (!res.applicable || res.predictions.length === 0) {
        evaluatedModels.push({
          modelId: model.getId(),
          modelName: model.getName(),
          version: model.getVersion(),
          applicable: false,
          ineligibilityReason: res.ineligibilityReason || 'Failed to complete rolling validation',
          mae: null,
          rmse: null,
          wape: null,
          mape: null,
          bias: null,
          directionalBias: 'Neutral',
          reliability: 'Low',
          testedSteps: 0,
        });
        continue;
      }

      const m = res.predictions.length;
      const sumAbsError = res.absoluteErrors.reduce((a, b) => a + b, 0);
      const sumSqError = res.squaredErrors.reduce((a, b) => a + b, 0);
      const sumActual = res.actuals.reduce((a, b) => a + b, 0);
      const sumError = res.errors.reduce((a, b) => a + b, 0);

      // MAE
      const mae = parseFloat((sumAbsError / m).toFixed(2));

      // RMSE
      const rmse = parseFloat(Math.sqrt(sumSqError / m).toFixed(2));

      // WAPE: (sum(|actual - pred|) / sum(actual)) * 100%
      let wape = 0;
      if (sumActual > 0) {
        wape = parseFloat(((sumAbsError / sumActual) * 100).toFixed(2));
      } else if (sumAbsError === 0) {
        wape = 0.0;
      } else {
        wape = 100.0;
      }

      // MAPE: mean of non-zero percentage errors
      let mape = 0;
      if (res.percentageErrors.length > 0) {
        const sumPerc = res.percentageErrors.reduce((a, b) => a + b, 0);
        mape = parseFloat((sumPerc / res.percentageErrors.length).toFixed(2));
      } else {
        mape = wape; // Fallback to WAPE when all actuals are zero
      }

      // Bias: mean error (pred - actual)
      const bias = parseFloat((sumError / m).toFixed(2));
      let directionalBias = 'Unbiased';
      if (bias > 0.05 * (mae || 1)) {
        directionalBias = 'Over-forecasting';
      } else if (bias < -0.05 * (mae || 1)) {
        directionalBias = 'Under-forecasting';
      }

      // Reliability classification
      let reliability = 'Low';
      if (wape <= 18 && m >= 4) {
        reliability = 'High';
      } else if (wape <= 35 && m >= 2) {
        reliability = 'Moderate';
      }

      evaluatedModels.push({
        modelId: model.getId(),
        modelName: model.getName(),
        version: model.getVersion(),
        applicable: true,
        mae,
        rmse,
        wape,
        mape,
        bias,
        directionalBias,
        reliability,
        testedSteps: m,
      });
    }

    // Sort applicable models by WAPE ascending (tie break: MAE ascending)
    const rankedApplicable = evaluatedModels
      .filter(m => m.applicable)
      .sort((a, b) => {
        if (a.wape !== b.wape) return a.wape - b.wape;
        return a.mae - b.mae;
      });

    rankedApplicable.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    const bestModel = rankedApplicable.length > 0 ? rankedApplicable[0] : null;

    // Combine applicable (ranked) and non-applicable
    const finalModels = [
      ...rankedApplicable,
      ...evaluatedModels.filter(m => !m.applicable).map(m => ({ ...m, rank: null })),
    ];

    return {
      hasSufficientData: true,
      totalPoints: N,
      testSteps: numTestSteps,
      trainPoints: testStartIndex,
      validationPoints: numTestSteps,
      bestModelId: bestModel ? bestModel.modelId : null,
      bestModelName: bestModel ? bestModel.modelName : null,
      bestModelWape: bestModel ? bestModel.wape : null,
      models: finalModels,
      timeline,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

module.exports = BacktestingEngine;
