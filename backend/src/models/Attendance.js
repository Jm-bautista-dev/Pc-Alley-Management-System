const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  branchId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Branches',
      key: 'id'
    }
  },
  clockInTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  clockOutTime: {
    type: DataTypes.DATE
  },
  status: {
    type: DataTypes.ENUM('Present', 'Late', 'Absent'),
    defaultValue: 'Present'
  }
}, {
  tableName: 'attendances'
});

module.exports = Attendance;
