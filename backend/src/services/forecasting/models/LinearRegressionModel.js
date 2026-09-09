const BaseForecastModel = require('./BaseForecastModel');

class LinearRegressionModel extends BaseForecastModel {
  constructor() {
    super('linear_regression', 'Linear Regression (OLS Trend)', 'v1.0');
    this.slope = 0;
    this.intercept = 0;
    this.sampleCount = 0;
  }

  getMinPoints() {
    return 3;
  }

  train(historyData) {
    const n = historyData ? historyData.length : 0;
    this.sampleCount = n;
    if (n < 2) {
      const v = n === 1 ? (typeof historyData[0].value === 'number' ? historyData[0].value : (historyData[0].revenue || 0)) : 0;
      this.slope = 0;
      this.intercept = v;
      return;
    }

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    historyData.forEach((pt, i) => {
      const x = i + 1;
      const y = typeof pt.value === 'number' ? pt.value : (pt.revenue || 0);
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    });

    const denom = n * sumXX - sumX * sumX;
    this.slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    this.intercept = (sumY - this.slope * sumX) / n;
  }

  predict(stepsAhead = 1) {
    const nextX = this.sampleCount + stepsAhead;
    const forecast = this.slope * nextX + this.intercept;
    return Math.max(0, parseFloat(forecast.toFixed(2)));
  }
}

module.exports = LinearRegressionModel;
