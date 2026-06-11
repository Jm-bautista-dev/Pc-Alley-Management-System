const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  branchId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Branches',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT
  },
  receiptUrl: {
    type: DataTypes.STRING
  },
  expenseDate: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'expenses'
});

module.exports = Expense;
