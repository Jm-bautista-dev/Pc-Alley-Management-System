const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const RestockRequest = sequelize.define('RestockRequest', {
  product_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    references: { model: 'products', key: 'id' } 
  },
  branch_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    references: { model: 'branches', key: 'id' } 
  },
  manager_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    references: { model: 'users', key: 'id' } 
  },
  quantity: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  cost_price: {
    type: DataTypes.DECIMAL(10, 2)
  },
  supplier_id: {
    type: DataTypes.INTEGER,
    references: { model: 'suppliers', key: 'id' }
  },
  notes: { 
    type: DataTypes.TEXT 
  },
  status: { 
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'), 
    defaultValue: 'Pending' 
  },
  admin_id: { 
    type: DataTypes.INTEGER, 
    references: { model: 'users', key: 'id' } 
  },
  rejection_reason: { 
    type: DataTypes.TEXT 
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'restockrequests'
});

module.exports = RestockRequest;
