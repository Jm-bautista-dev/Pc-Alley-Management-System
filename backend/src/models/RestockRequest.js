const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const RestockRequest = sequelize.define('RestockRequest', {
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
  manager_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    references: { model: 'Users', key: 'id' } 
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
    references: { model: 'Suppliers', key: 'id' }
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
    references: { model: 'Users', key: 'id' } 
  },
  rejection_reason: { 
    type: DataTypes.TEXT 
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = RestockRequest;
