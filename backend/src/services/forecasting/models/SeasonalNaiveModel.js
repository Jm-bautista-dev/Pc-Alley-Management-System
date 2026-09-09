const BaseForecastModel = require('./BaseForecastModel');

class SeasonalNaiveModel extends BaseForecastModel {
  constructor(seasonalPeriod = 7) {
    super('seasonal_naive', `Seasonal Naive (s=${seasonalPeriod})`, 'v1.0');
    this.seasonalPeriod = seasonalPeriod;
    this.history = [];
  }

  setSeasonalPeriod(period) {
    this.seasonalPeriod = Math.max(2, parseInt(period, 10) || 7);
    this.name = `Seasonal Naive (s=${this.seasonalPeriod})`;
  }

  getMinPoints() {
    return this.seasonalPeriod;
  }

  requiresSeasonality() {
    return true;
  }

  train(historyData) {
    this.history = (historyData || []).map(pt => (typeof pt.value === 'number' ? pt.value : (pt.revenue || 0)));
  }

  predict(stepsAhead = 1) {
    const n = this.history.length;
    if (n === 0) return 0;
    if (n < this.seasonalPeriod) {
      // Fall back to standard naive
      return Math.max(0, parseFloat((this.history[n - 1] || 0).toFixed(2)));
    }

    // Index from same season in previous cycle
    const targetIdx = n - this.seasonalPeriod + ((stepsAhead - 1) % this.seasonalPeriod);
    const val = (targetIdx >= 0 && targetIdx < n) ? this.history[targetIdx] : this.history[n - 1];
    return Math.max(0, parseFloat(val.toFixed(2)));
  }
}

module.exports = SeasonalNaiveModel;
