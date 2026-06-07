const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    references: { model: 'Users', key: 'id' } 
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
    defaultValue: false 
  }
});

module.exports = Notification;
