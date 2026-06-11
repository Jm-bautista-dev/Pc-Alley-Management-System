const sequelize = require('../src/db');

async function dropTables() {
  try {
    await sequelize.query('DROP TABLE IF EXISTS Notifications;');
    console.log('Notifications table dropped.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

dropTables();
