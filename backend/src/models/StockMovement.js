const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const StockMovement = sequelize.define('StockMovement', {
  product_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'products', key: 'id' } },
  type: { type: DataTypes.ENUM('RESTOCK', 'SALE', 'ADJUSTMENT', 'TRANSFER'), allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false }, // positive or negative
  previous_stock: { type: DataTypes.INTEGER, allowNull: false },
  new_stock: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  supplier_id: { type: DataTypes.INTEGER, references: { model: 'suppliers', key: 'id' } },
  note: { type: DataTypes.STRING }
}, {
  tableName: 'stockmovements'
});

module.exports = StockMovement;
