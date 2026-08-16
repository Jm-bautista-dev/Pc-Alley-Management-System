const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ProductBundle = sequelize.define('ProductBundle', {
  bundle_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'products', key: 'id' } },
  product_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'products', key: 'id' } },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
}, {
  tableName: 'productbundles',
  indexes: [{ unique: true, fields: ['bundle_id', 'product_id'] }]
});

module.exports = ProductBundle;
