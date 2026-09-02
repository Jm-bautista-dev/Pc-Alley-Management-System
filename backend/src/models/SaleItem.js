const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const SaleItem = sequelize.define('SaleItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  saleId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sales',
      key: 'id'
    }
  },
  item_type: {
    type: DataTypes.ENUM('product', 'service'),
    allowNull: false,
    defaultValue: 'product'
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  serviceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'services',
      key: 'id'
    }
  },
  serviceJobId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'service_jobs',
      key: 'id'
    }
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  productSku: {
    type: DataTypes.STRING,
    allowNull: true
  },
  priceOverrideReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  unitPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  }
}, {
  tableName: 'saleitems'
});

module.exports = SaleItem;
