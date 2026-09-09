const BaseForecastModel = require('./BaseForecastModel');

class SimpleExponentialSmoothingModel extends BaseForecastModel {
  constructor(alpha = 0.35) {
    super('exponential_smoothing', `Simple Exponential Smoothing (α=${alpha})`, 'v1.0');
    this.alpha = alpha;
    this.level = 0;
  }

  getMinPoints() {
    return 2;
  }

  train(historyData) {
    const n = historyData ? historyData.length : 0;
    if (n === 0) {
      this.level = 0;
      return;
    }

    const firstVal = typeof historyData[0].value === 'number' ? historyData[0].value : (historyData[0].revenue || 0);
    this.level = firstVal;

    for (let i = 1; i < n; i++) {
      const val = typeof historyData[i].value === 'number' ? historyData[i].value : (historyData[i].revenue || 0);
      this.level = this.alpha * val + (1 - this.alpha) * this.level;
    }
  }

  predict(stepsAhead = 1) {
    return Math.max(0, parseFloat(this.level.toFixed(2)));
  }
}

module.exports = SimpleExponentialSmoothingModel;
