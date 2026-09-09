const BaseForecastModel = require('./BaseForecastModel');

class NaiveForecastModel extends BaseForecastModel {
  constructor() {
    super('naive', 'Naive Forecast', 'v1.0');
    this.lastValue = 0;
  }

  getMinPoints() {
    return 1;
  }

  train(historyData) {
    if (!historyData || historyData.length === 0) {
      this.lastValue = 0;
      return;
    }
    const lastItem = historyData[historyData.length - 1];
    this.lastValue = typeof lastItem.value === 'number' ? lastItem.value : (lastItem.revenue || 0);
  }

  predict(stepsAhead = 1) {
    return Math.max(0, parseFloat(this.lastValue.toFixed(2)));
  }
}

module.exports = NaiveForecastModel;
