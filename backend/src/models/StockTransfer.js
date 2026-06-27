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
      model: 'Branches',
      key: 'id'
    }
  },
  toBranchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Branches',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('Pending', 'In-Transit', 'Completed'),
    defaultValue: 'Pending'
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'stocktransfers'
});

module.exports = StockTransfer;
