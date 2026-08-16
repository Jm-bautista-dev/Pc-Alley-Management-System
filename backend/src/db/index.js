const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbName = process.env.DB_NAME || 'pc_alley_db';
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASS || '';
const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = parseInt(process.env.DB_PORT || '3306', 10);

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: false,
  dialectOptions: { connectTimeout: 10000 },
});

// Only auto-create database locally when connecting as root
if (dbUser === 'root') {
  const tempSequelize = new Sequelize('', dbUser, dbPass, {
    host: dbHost,
    port: dbPort,
    dialect: 'mysql',
    logging: false,
    dialectOptions: { connectTimeout: 5000 },
  });

  tempSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`)
    .then(() => {
      console.log(`DATABASE: '${dbName}' is ready.`);
      return tempSequelize.close();
    })
    .catch((err) => {
      // Ignored for non-root or already created databases
    });
}

module.exports = sequelize;

