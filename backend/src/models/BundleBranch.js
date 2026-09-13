const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const BundleBranch = sequelize.define('BundleBranch', {
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
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'branches',
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'bundle_branches',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['bundle_id', 'branch_id']
    }
  ]
});

module.exports = BundleBranch;
