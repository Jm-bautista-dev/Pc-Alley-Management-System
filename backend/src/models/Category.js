const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Category = sequelize.define('Category', {
  name: { type: DataTypes.STRING, allowNull: false, unique: true }
}, {
  tableName: 'categories'
});

module.exports = Category;
