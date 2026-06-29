const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const BranchProduct = sequelize.define('BranchProduct', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Products', key: 'id' }
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Branches', key: 'id' }
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  low_stock_threshold: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    allowNull: false
  }
}, {
  tableName: 'branch_products',
  timestamps: false,
  indexes: [{ unique: true, fields: ['product_id', 'branch_id'] }]
});

// Virtual quantity field and JSON representation to maintain compatibility with existing Inventory model usage
BranchProduct.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  values.quantity = values.stock;
  return values;
};

// Add helper virtual property getter/setter for compatibility
Object.defineProperty(BranchProduct.prototype, 'quantity', {
  get() {
    return this.stock;
  },
  set(val) {
    this.stock = val;
  }
});

module.exports = BranchProduct;
