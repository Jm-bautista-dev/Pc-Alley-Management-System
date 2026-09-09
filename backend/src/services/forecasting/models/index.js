const BaseForecastModel = require('./BaseForecastModel');
const NaiveForecastModel = require('./NaiveForecastModel');
const MovingAverageModel = require('./MovingAverageModel');
const SimpleExponentialSmoothingModel = require('./SimpleExponentialSmoothingModel');
const HoltLinearTrendModel = require('./HoltLinearTrendModel');
const LinearRegressionModel = require('./LinearRegressionModel');
const SeasonalNaiveModel = require('./SeasonalNaiveModel');

/**
 * Returns instantiated models suitable for benchmarking given data characteristics.
 * @param {Object} options
 * @param {string} options.frequency - 'daily' | 'weekly' | 'monthly'
 * @param {number} options.seasonalPeriod - optional seasonal period override
 */
function getAvailableModels(options = {}) {
  const { frequency = 'daily', seasonalPeriod } = options;

  let sPeriod = 7;
  if (seasonalPeriod && seasonalPeriod > 1) {
    sPeriod = seasonalPeriod;
  } else if (frequency === 'monthly') {
    sPeriod = 12;
  } else if (frequency === 'weekly') {
    sPeriod = 4;
  } else {
    sPeriod = 7; // daily weekly cycle
  }

  return [
    new NaiveForecastModel(),
    new MovingAverageModel(3),
    new SimpleExponentialSmoothingModel(0.3),
    new HoltLinearTrendModel(0.3, 0.1),
    new LinearRegressionModel(),
    new SeasonalNaiveModel(sPeriod),
  ];
}

module.exports = {
  BaseForecastModel,
  NaiveForecastModel,
  MovingAverageModel,
  SimpleExponentialSmoothingModel,
  HoltLinearTrendModel,
  LinearRegressionModel,
  SeasonalNaiveModel,
  getAvailableModels,
};
