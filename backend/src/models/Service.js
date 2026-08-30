const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Service = sequelize.define('Service', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Other' // Diagnostics, Repair, Installation, Maintenance, Assembly, Software, Other
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pricing_type: {
    type: DataTypes.ENUM('fixed', 'variable', 'custom'),
    allowNull: false,
    defaultValue: 'fixed'
  },
  base_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  estimated_duration_mins: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 60
  },
  requires_device_info: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'archived'),
    allowNull: false,
    defaultValue: 'active'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'services',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});

module.exports = Service;
