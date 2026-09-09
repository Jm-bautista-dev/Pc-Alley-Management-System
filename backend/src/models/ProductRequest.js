const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ProductRequest = sequelize.define('ProductRequest', {
  request_number: { type: DataTypes.STRING, unique: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  requested_by: { type: DataTypes.INTEGER, allowNull: false },
  quantity_requested: { type: DataTypes.INTEGER, allowNull: false },
  quantity_approved: { type: DataTypes.INTEGER, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  priority: { type: DataTypes.ENUM('low','normal','urgent'), defaultValue: 'normal' },
  status: { 
    type: DataTypes.STRING(50), 
    defaultValue: 'PENDING' 
  },
  source_branch_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'branches', key: 'id' } },
  requested_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  approved_at: { type: DataTypes.DATE, allowNull: true },
  approval_notes: { type: DataTypes.TEXT, allowNull: true },
  processed_at: { type: DataTypes.DATE, allowNull: true },
  approved_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
  fulfilled_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
  fulfilled_at: { type: DataTypes.DATE, allowNull: true },
  quantity_fulfilled: { type: DataTypes.INTEGER, allowNull: true },
  received_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
  received_at: { type: DataTypes.DATE, allowNull: true },
  scheduled_date: { type: DataTypes.DATEONLY, allowNull: true },
  scheduled_time: { type: DataTypes.TIME, allowNull: true },
  rejection_reason: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'product_requests',
  hooks: {
    beforeCreate: async (request, options) => {
      if (!request.request_number) {
        const datePart = new Date().toISOString().slice(0,10).replace(/-/g,'');
        const count = await ProductRequest.count({ where: { createdAt: { [sequelize.Op.gte]: new Date().setHours(0,0,0,0) } } });
        const seq = String(count + 1).padStart(4, '0');
        request.request_number = `SR-${datePart}-${seq}`;
      }
      if (request.status) {
        request.status = request.status.toUpperCase();
      }
    }
  }
});

module.exports = ProductRequest;
