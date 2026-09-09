const BaseForecastModel = require('./BaseForecastModel');

class HoltLinearTrendModel extends BaseForecastModel {
  constructor(alpha = 0.4, beta = 0.2) {
    super('holt_linear', "Holt's Linear Trend", 'v1.0');
    this.alpha = alpha;
    this.beta = beta;
    this.level = 0;
    this.trend = 0;
  }

  getMinPoints() {
    return 3;
  }

  train(historyData) {
    const n = historyData ? historyData.length : 0;
    if (n === 0) {
      this.level = 0;
      this.trend = 0;
      return;
    }
    if (n === 1) {
      const v = typeof historyData[0].value === 'number' ? historyData[0].value : (historyData[0].revenue || 0);
      this.level = v;
      this.trend = 0;
      return;
    }

    const y0 = typeof historyData[0].value === 'number' ? historyData[0].value : (historyData[0].revenue || 0);
    const y1 = typeof historyData[1].value === 'number' ? historyData[1].value : (historyData[1].revenue || 0);

    let level = y1;
    let trend = y1 - y0;

    for (let i = 2; i < n; i++) {
      const val = typeof historyData[i].value === 'number' ? historyData[i].value : (historyData[i].revenue || 0);
      const prevLevel = level;
      const prevTrend = trend;

      level = this.alpha * val + (1 - this.alpha) * (prevLevel + prevTrend);
      trend = this.beta * (level - prevLevel) + (1 - this.beta) * prevTrend;
    }

    this.level = level;
    this.trend = trend;
  }

  predict(stepsAhead = 1) {
    const forecast = this.level + (stepsAhead * this.trend);
    return Math.max(0, parseFloat(forecast.toFixed(2)));
  }
}

module.exports = HoltLinearTrendModel;
