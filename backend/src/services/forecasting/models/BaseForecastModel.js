/**
 * Abstract Base Class for Forecast Models
 * Enforces a consistent, pluggable interface for all forecasting algorithms.
 */
class BaseForecastModel {
  constructor(id, name, version = 'v1.0') {
    if (new.target === BaseForecastModel) {
      throw new TypeError('Cannot construct BaseForecastModel instances directly.');
    }
    this.id = id;
    this.name = name;
    this.version = version;
  }

  getId() {
    return this.id;
  }

  getName() {
    return this.name;
  }

  getVersion() {
    return this.version;
  }

  /**
   * Minimum data points required to train this model.
   */
  getMinPoints() {
    return 2;
  }

  /**
   * Whether this model requires seasonal cycle data.
   */
  requiresSeasonality() {
    return false;
  }

  /**
   * Train model on historical data points.
   * historyData: Array<{ period: string, value: number, ... }>
   */
  train(historyData) {
    throw new Error("Method 'train()' must be implemented.");
  }

  /**
   * Predict values for steps ahead into the future.
   * stepsAhead: number (e.g. 1 for next step)
   * returns: number (predicted value >= 0)
   */
  predict(stepsAhead = 1) {
    throw new Error("Method 'predict()' must be implemented.");
  }
}

module.exports = BaseForecastModel;
