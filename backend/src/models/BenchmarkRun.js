const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const BenchmarkRun = sequelize.define('BenchmarkRun', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  scope_type: {
    type: DataTypes.ENUM('all', 'branch', 'category', 'product'),
    defaultValue: 'all',
    allowNull: false
  },
  scope_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'branches', key: 'id' }
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  frequency: {
    type: DataTypes.STRING(20),
    defaultValue: 'monthly',
    allowNull: false
  },
  horizon: {
    type: DataTypes.STRING(20),
    defaultValue: '30d',
    allowNull: true
  },
  validation_method: {
    type: DataTypes.STRING(50),
    defaultValue: 'walk_forward',
    allowNull: false
  },
  validation_windows: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('completed', 'insufficient_data', 'failed'),
    defaultValue: 'completed',
    allowNull: false
  },
  best_model: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  best_wape: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true
  },
  best_mae: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  best_rmse: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  best_bias: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  reliability: {
    type: DataTypes.STRING(20),
    defaultValue: 'Moderate',
    allowNull: true
  },
  recommendation_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  }
}, {
  tableName: 'benchmark_runs',
  timestamps: true
});

module.exports = BenchmarkRun;
