const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { User } = require('../src/models');
const sequelize = require('../src/db');

const debugAdmin = async () => {
  try {
    await sequelize.authenticate();
    const user = await User.findOne({ where: { username: 'admin@pcalley.com' } });
    if (user) {
      console.log('User: admin@pcalley.com');
      console.log('Role:', user.role);
      console.log('Password Hash:', user.password);
    } else {
      console.log('User admin@pcalley.com NOT FOUND');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

debugAdmin();
