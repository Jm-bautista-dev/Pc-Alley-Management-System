const sequelize = require('../src/db');
const models = require('../src/models');

async function syncDB() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    // Alter true updates tables to match models without dropping them
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully with new models/fields.');
    process.exit(0);
  } catch (error) {
    console.error('Unable to connect to the database or sync:', error);
    process.exit(1);
  }
}

syncDB();
