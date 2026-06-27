const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    references: { model: 'Users', key: 'id' },
    field: 'user_id'
  },
  title: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  message: { 
    type: DataTypes.TEXT, 
    allowNull: false 
  },
  type: { 
    type: DataTypes.STRING, 
    defaultValue: 'info' 
  },
  link: { 
    type: DataTypes.STRING 
  },
  isRead: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false,
    field: 'is_read'
  },
  branchId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Branches', key: 'id' },
    field: 'branch_id'
  }
});

module.exports = Notification;
