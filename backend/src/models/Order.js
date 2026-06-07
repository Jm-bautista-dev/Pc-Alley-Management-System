const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Order = sequelize.define('Order', {
  branch_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Branches', key: 'id' } },
  user_id: { type: DataTypes.INTEGER, references: { model: 'Users', key: 'id' } },
  customer_name: { type: DataTypes.STRING },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  payment_method: { type: DataTypes.STRING },
  status: { 
    type: DataTypes.ENUM('pending', 'completed', 'cancelled'), 
    defaultValue: 'completed' 
  },
  proof_of_payment_url: { type: DataTypes.STRING }
});

module.exports = Order;
