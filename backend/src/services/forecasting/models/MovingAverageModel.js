const BaseForecastModel = require('./BaseForecastModel');

class MovingAverageModel extends BaseForecastModel {
  constructor(windowSize = 3) {
    super('moving_average', `Moving Average (k=${windowSize})`, 'v1.0');
    this.windowSize = windowSize;
    this.average = 0;
  }

  getMinPoints() {
    return 2;
  }

  train(historyData) {
    const n = historyData ? historyData.length : 0;
    if (n === 0) {
      this.average = 0;
      return;
    }
    const k = Math.min(this.windowSize, n);
    const slice = historyData.slice(n - k);
    const sum = slice.reduce((acc, pt) => {
      const val = typeof pt.value === 'number' ? pt.value : (pt.revenue || 0);
      return acc + val;
    }, 0);
    this.average = sum / k;
  }

  predict(stepsAhead = 1) {
    return Math.max(0, parseFloat(this.average.toFixed(2)));
  }
}

module.exports = MovingAverageModel;
