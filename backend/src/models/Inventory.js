const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Inventory = sequelize.define('Inventory', {
  product_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'products', key: 'id' } },
  branch_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'branches', key: 'id' } },
  quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  low_stock_threshold: { type: DataTypes.INTEGER, defaultValue: 5 }
}, {
  tableName: 'inventories',
  indexes: [{ unique: true, fields: ['product_id', 'branch_id'] }]
});

module.exports = Inventory;
