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
  status: { type: DataTypes.ENUM('Pending','Approved','Partially Approved','Rejected','Scheduled','Completed','Cancelled'), defaultValue: 'Pending' },
  requested_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  approved_at: { type: DataTypes.DATE, allowNull: true },
  processed_at: { type: DataTypes.DATE, allowNull: true },
  approved_by: { type: DataTypes.INTEGER, allowNull: true },
  scheduled_date: { type: DataTypes.DATEONLY, allowNull: true },
  scheduled_time: { type: DataTypes.TIME, allowNull: true },
  rejection_reason: { type: DataTypes.TEXT, allowNull: true },
}, {
  hooks: {
    beforeCreate: async (request, options) => {
      if (!request.request_number) {
        const datePart = new Date().toISOString().slice(0,10).replace(/-/g,'');
        const count = await ProductRequest.count({ where: { createdAt: { [sequelize.Op.gte]: new Date().setHours(0,0,0,0) } } });
        const seq = String(count + 1).padStart(4, '0');
        request.request_number = `PR-${datePart}-${seq}`;
      }
    }
  }
});

module.exports = ProductRequest;
