const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const BenchmarkResult = sequelize.define('BenchmarkResult', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  benchmark_run_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'benchmark_runs', key: 'id' },
    onDelete: 'CASCADE'
  },
  model_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  model_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  model_version: {
    type: DataTypes.STRING(20),
    defaultValue: 'v1.0',
    allowNull: false
  },
  mae: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  rmse: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  mape: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true
  },
  wape: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  bias: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  accuracy: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  reliability: {
    type: DataTypes.STRING(20),
    defaultValue: 'Moderate',
    allowNull: false
  },
  rank: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  validation_windows: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'evaluated',
    allowNull: false
  },
  failure_reason: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'benchmark_results',
  timestamps: true
});

module.exports = BenchmarkResult;
