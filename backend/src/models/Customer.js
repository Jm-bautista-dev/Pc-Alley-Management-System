const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING
  },
  phone: {
    type: DataTypes.STRING
  },
  address: {
    type: DataTypes.TEXT
  },
  branchId: {
    type: DataTypes.INTEGER
  },
  totalSpent: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  totalOrders: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'customers'
});

module.exports = Customer;
