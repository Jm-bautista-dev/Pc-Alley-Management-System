const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Category = sequelize.define('Category', {
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  slug: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.STRING, defaultValue: 'active', allowNull: false },
  deleted_at: { type: DataTypes.DATE, allowNull: true },
  spec_template: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('spec_template');
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    set(val) {
      if (!val) {
        this.setDataValue('spec_template', null);
      } else if (typeof val === 'object') {
        this.setDataValue('spec_template', JSON.stringify(val));
      } else {
        this.setDataValue('spec_template', val);
      }
    }
  }
}, {
  tableName: 'categories',
  paranoid: true,
  deletedAt: 'deleted_at',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = Category;
