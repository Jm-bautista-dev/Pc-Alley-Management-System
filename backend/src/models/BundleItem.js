const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const BundleItem = sequelize.define('BundleItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bundle_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'bundles',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }
}, {
  tableName: 'bundle_items',
  timestamps: true,
  indexes: [
    {
      fields: ['bundle_id', 'product_id']
    }
  ]
});

module.exports = BundleItem;
