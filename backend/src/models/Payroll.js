const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Payroll = sequelize.define('Payroll', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  periodStart: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  periodEnd: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  baseSalary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  allowances: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  deductions: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  netSalary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Paid'),
    defaultValue: 'Draft'
  }
}, {
  tableName: 'payrolls'
});

module.exports = Payroll;
