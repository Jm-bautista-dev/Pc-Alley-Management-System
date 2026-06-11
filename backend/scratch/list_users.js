require('dotenv').config({ path: './backend/.env' });
const { User } = require('../src/models');
const sequelize = require('../src/db');

async function listAllUsers() {
  try {
    await sequelize.authenticate();
    const users = await User.findAll();
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listAllUsers();
