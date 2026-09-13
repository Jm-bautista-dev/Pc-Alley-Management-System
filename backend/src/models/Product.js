const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  sku: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.TEXT },
  category_id: { type: DataTypes.INTEGER, references: { model: 'categories', key: 'id' } },
  brand_id: { type: DataTypes.INTEGER, references: { model: 'brands', key: 'id' } },
  barcode: { type: DataTypes.STRING, allowNull: true },
  specifications: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('specifications');
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    },
    set(value) {
      if (value === null || value === undefined || value === '') {
        this.setDataValue('specifications', null);
      } else if (typeof value === 'object') {
        this.setDataValue('specifications', JSON.stringify(value));
      } else {
        this.setDataValue('specifications', String(value).trim());
      }
    }
  },
  status: { type: DataTypes.STRING, defaultValue: 'active', allowNull: false },
  supplier_id: { type: DataTypes.INTEGER, references: { model: 'suppliers', key: 'id' } },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  last_purchase_price: { type: DataTypes.DECIMAL(10, 2) },
  image_url: { type: DataTypes.STRING },
  product_image: { type: DataTypes.STRING },
  is_bundle: { type: DataTypes.BOOLEAN, defaultValue: false },
  max_request_quantity: { type: DataTypes.INTEGER, allowNull: true },
  min_request_quantity: { type: DataTypes.INTEGER, allowNull: true },
  available_quantity: { type: DataTypes.INTEGER, defaultValue: 100 },
  reserved_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  branch_id: { type: DataTypes.INTEGER, references: { model: 'branches', key: 'id' } }
}, {
  tableName: 'products',
  paranoid: true,
  deletedAt: 'deleted_at',
  timestamps: true,
  hooks: {
    beforeSave: (product) => {
      // Keep image_url and product_image strictly synchronized across the system
      if (product.image_url && !product.product_image) {
        product.product_image = product.image_url;
      } else if (product.product_image && !product.image_url) {
        product.image_url = product.product_image;
      } else if (product.changed && product.changed('image_url') && !product.image_url) {
        product.product_image = null;
      } else if (product.changed && product.changed('product_image') && !product.product_image) {
        product.image_url = null;
      }
    }
  }
});

module.exports = Product;
