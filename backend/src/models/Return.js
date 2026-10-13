const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Return = sequelize.define('Return', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  return_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  sale_id: {
    type: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin',
    allowNull: false,
    references: {
      model: 'sales',
      key: 'id'
    }
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  customer_id: {
    type: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin',
    allowNull: true,
    references: {
      model: 'customers',
      key: 'id'
    }
  },
  customer_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Requested', 'Received for Inspection', 'Approved', 'Rejected'),
    defaultValue: 'Requested',
    allowNull: false
  },
  disposition: {
    type: DataTypes.ENUM('refund', 'exchange', 'restock_review'),
    defaultValue: 'restock_review',
    allowNull: false
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false
  },
  condition_note: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  restock_resellable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  refund_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    allowNull: false
  },
  requested_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reviewed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'returns',
  timestamps: true
});

module.exports = Return;
