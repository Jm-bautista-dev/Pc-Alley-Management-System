const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const User = sequelize.define('User', {
  first_name: { type: DataTypes.STRING, allowNull: true },
  last_name: { type: DataTypes.STRING, allowNull: true },
  username: { type: DataTypes.STRING, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM('super_admin', 'branch_admin', 'employee'),
    defaultValue: 'employee'
  },
  branch_id: { type: DataTypes.INTEGER, references: { model: 'branches', key: 'id' } }
}, {
  tableName: 'users'
});

module.exports = User;
