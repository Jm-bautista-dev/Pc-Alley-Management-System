const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const UserRole = sequelize.define('UserRole', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'roles',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  }
}, {
  tableName: 'user_roles',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'role_id'],
      name: 'unique_user_role'
    },
    {
      fields: ['user_id'],
      name: 'idx_user_roles_user'
    },
    {
      fields: ['role_id'],
      name: 'idx_user_roles_role'
    }
  ]
});

module.exports = UserRole;
