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
    references: { model: 'users', key: 'id' },
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
    references: { model: 'branches', key: 'id' },
    field: 'branch_id'
  }
}, {
  tableName: 'notifications',
  hooks: {
    beforeValidate: (notification) => {
      if (notification.user_id !== undefined && notification.userId === undefined) {
        notification.userId = notification.user_id;
      }
      if (notification.branch_id !== undefined && notification.branchId === undefined) {
        notification.branchId = notification.branch_id;
      }
      if (notification.is_read !== undefined && notification.isRead === undefined) {
        notification.isRead = notification.is_read;
      }
    },
    beforeBulkCreate: (notifications) => {
      for (const n of notifications) {
        if (n.user_id !== undefined && n.userId === undefined) {
          n.userId = n.user_id;
        }
        if (n.branch_id !== undefined && n.branchId === undefined) {
          n.branchId = n.branch_id;
        }
        if (n.is_read !== undefined && n.isRead === undefined) {
          n.isRead = n.is_read;
        }
      }
    }
  }
});

module.exports = Notification;
