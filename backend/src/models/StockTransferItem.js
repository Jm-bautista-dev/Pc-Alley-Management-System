const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const StockTransferItem = sequelize.define('StockTransferItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  transferId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'stocktransfers',
      key: 'id'
    }
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Products',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'stocktransferitems'
});

module.exports = StockTransferItem;
