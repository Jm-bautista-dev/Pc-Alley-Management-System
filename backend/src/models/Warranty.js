const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Warranty = sequelize.define('Warranty', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  customer_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  valid_until: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false
  },
  note: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Sent', 'Accepted', 'Expired'),
    defaultValue: 'Draft'
  },
  archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'warranties',
  timestamps: true
});

module.exports = Warranty;
