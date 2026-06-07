const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const StockMovement = sequelize.define('StockMovement', {
  product_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Products', key: 'id' } },
  type: { type: DataTypes.ENUM('RESTOCK', 'SALE', 'ADJUSTMENT'), allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false }, // positive or negative
  previous_stock: { type: DataTypes.INTEGER, allowNull: false },
  new_stock: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, references: { model: 'Users', key: 'id' } },
  supplier_id: { type: DataTypes.INTEGER, references: { model: 'Suppliers', key: 'id' } },
  note: { type: DataTypes.STRING }
});

module.exports = StockMovement;
