const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const OrderItem = sequelize.define('OrderItem', {
  order_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Orders', key: 'id' } },
  product_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Products', key: 'id' } },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  price_at_sale: { type: DataTypes.DECIMAL(10, 2), allowNull: false } // Key historical requirement
});

module.exports = OrderItem;
