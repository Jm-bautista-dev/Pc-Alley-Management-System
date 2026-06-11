const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoiceNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  customerId: {
    type: DataTypes.UUID,
    references: {
      model: 'customers',
      key: 'id'
    }
  },
  customerName: {
    type: DataTypes.STRING,
    defaultValue: 'Walk-in Customer'
  },
  branchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Branches',
      key: 'id'
    }
  },
  staffId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  staffName: {
    type: DataTypes.STRING
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'gcash', 'bank_transfer', 'mixed'),
    defaultValue: 'cash'
  },
  status: {
    type: DataTypes.ENUM('completed', 'voided', 'refunded', 'draft', 'quotation'),
    defaultValue: 'completed'
  },
  notes: {
    type: DataTypes.TEXT
  },
  amountPaid: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  changeAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00
  }
}, {
  tableName: 'sales'
});

module.exports = Sale;
