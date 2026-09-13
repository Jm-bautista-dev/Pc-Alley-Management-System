const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const UserSession = sequelize.define('UserSession', {
  id: {
    type: DataTypes.STRING(64),
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  token_hash: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  last_activity_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'user_sessions',
  timestamps: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['token_hash'] },
    { fields: ['is_active'] },
    { fields: ['expires_at'] }
  ]
});

module.exports = UserSession;
