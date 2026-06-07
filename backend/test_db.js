const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  port: parseInt(process.env.DB_PORT || '3307'),
  connectTimeout: 30000
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting:', err);
  } else {
    console.log('Successfully connected to MySQL!');
  }
  process.exit();
});
