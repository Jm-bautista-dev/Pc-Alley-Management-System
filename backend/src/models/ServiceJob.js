const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ServiceJob = sequelize.define('ServiceJob', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  job_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  customer_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'customers',
      key: 'id'
    }
  },
  customer_name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Walk-in Customer'
  },
  customer_phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  service_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'services',
      key: 'id'
    }
  },
  service_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  device_type: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Desktop PC'
  },
  device_specs: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  serial_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reported_issue: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM(
      'received',
      'diagnosing',
      'waiting_for_approval',
      'in_progress',
      'ready_for_release',
      'completed',
      'cancelled'
    ),
    allowNull: false,
    defaultValue: 'received'
  },
  estimated_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  final_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  price_override_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  technician_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  technician_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sale_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'sales',
      key: 'id'
    }
  },
  invoice_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customer_approved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  received_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'service_jobs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ServiceJob;
