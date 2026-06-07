const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDB() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      port: parseInt(process.env.DB_PORT || '3307'),
    });
    const [rows] = await connection.query('SHOW DATABASES LIKE "pc_alley_db"');
    if (rows.length > 0) {
      console.log('DATABASE_EXISTS');
    } else {
      console.log('DATABASE_MISSING');
    }
    await connection.end();
  } catch (err) {
    console.error('CONNECTION_ERROR', err.message);
  }
}

checkDB();
