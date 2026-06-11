const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbName = process.env.DB_NAME || 'pc_alley_db';
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASS || '';
const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = process.env.DB_PORT || 3306;

// First connect without a database to create it if it doesn't exist
const tempSequelize = new Sequelize('', dbUser, dbPass, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: false,
  dialectOptions: { connectTimeout: 10000 },
});

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: false,
  dialectOptions: { connectTimeout: 10000 },
});

// Auto-create the database if it doesn't exist
const ensureDatabase = async () => {
  try {
    await tempSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    console.log(`DATABASE: '${dbName}' is ready.`);
    await tempSequelize.close();
  } catch (err) {
    console.error('DATABASE SETUP ERROR:', err.message);
  }
};

ensureDatabase();

module.exports = sequelize;
