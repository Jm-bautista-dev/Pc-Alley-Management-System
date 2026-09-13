const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Brand = sequelize.define('Brand', {
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  slug: { type: DataTypes.STRING, unique: true },
  logo: { type: DataTypes.STRING, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING, defaultValue: 'active', allowNull: false },
  deleted_at: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'brands',
  paranoid: true,
  deletedAt: 'deleted_at',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Brand;
