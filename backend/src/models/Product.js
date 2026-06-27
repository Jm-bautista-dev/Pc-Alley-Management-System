const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  sku: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.TEXT },
  category_id: { type: DataTypes.INTEGER, references: { model: 'Categories', key: 'id' } },
  supplier_id: { type: DataTypes.INTEGER, references: { model: 'Suppliers', key: 'id' } },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  last_purchase_price: { type: DataTypes.DECIMAL(10, 2) },
  image_url: { type: DataTypes.STRING },
  product_image: { type: DataTypes.STRING },
  is_bundle: { type: DataTypes.BOOLEAN, defaultValue: false },
  max_request_quantity: { type: DataTypes.INTEGER, allowNull: true },
  min_request_quantity: { type: DataTypes.INTEGER, allowNull: true },
  available_quantity: { type: DataTypes.INTEGER, defaultValue: 100 },
  reserved_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  branch_id: { type: DataTypes.INTEGER, references: { model: 'Branches', key: 'id' } }
}, {
  paranoid: true,
  deletedAt: 'deleted_at',
  timestamps: true
});

module.exports = Product;
