const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { User } = require('../src/models');
const bcrypt = require('bcryptjs');
const sequelize = require('../src/db');

const resetAdmin = async () => {
  try {
    await sequelize.authenticate();
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const [updated] = await User.update(
      { password: hashedPassword },
      { where: { username: 'admin@pcalley.com' } }
    );
    
    if (updated) {
      console.log('Successfully reset password for admin@pcalley.com to "admin123"');
    } else {
      console.log('User admin@pcalley.com was not found or not updated.');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

resetAdmin();
