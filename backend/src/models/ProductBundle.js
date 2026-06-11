const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ProductBundle = sequelize.define('ProductBundle', {
  bundle_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Products', key: 'id' } },
  product_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Products', key: 'id' } },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
}, {
  indexes: [{ unique: true, fields: ['bundle_id', 'product_id'] }]
});

module.exports = ProductBundle;
