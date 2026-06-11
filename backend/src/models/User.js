const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const User = sequelize.define('User', {
  full_name: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  username: { type: DataTypes.STRING, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { 
    type: DataTypes.ENUM('super_admin', 'branch_admin', 'employee'), 
    defaultValue: 'employee' 
  },
  branch_id: { type: DataTypes.INTEGER, references: { model: 'Branches', key: 'id' } }
});

module.exports = User;
