const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const StockTransfer = sequelize.define('StockTransfer', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  fromBranchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  toBranchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  reference_number: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Submitted', 'Pending', 'In-Transit', 'Dispatched', 'Received', 'Completed', 'Cancelled'),
    defaultValue: 'Pending'
  },
  dispatched_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  received_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  dispatched_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  received_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'stocktransfers'
});

module.exports = StockTransfer;
