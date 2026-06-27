const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const PurchaseOrder = sequelize.define('PurchaseOrder', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  poNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Suppliers',
      key: 'id'
    }
  },
  branchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Branches',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('Ordered', 'Pending', 'Received'),
    defaultValue: 'Ordered'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  dueAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  }
}, {
  tableName: 'purchaseorders'
});

module.exports = PurchaseOrder;
