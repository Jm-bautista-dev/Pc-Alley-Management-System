const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { User } = require('../src/models');
const bcrypt = require('bcryptjs');
const sequelize = require('../src/db');

const testActualLogin = async (username, password) => {
  try {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      console.log(`[FAIL] User not found: ${username}`);
      return;
    }
    
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      console.log(`[SUCCESS] Password matches for ${username}`);
    } else {
      console.log(`[FAIL] Password mismatch for ${username}. Provided: ${password}`);
    }
  } catch (err) {
    console.error(`Error testing ${username}:`, err.message);
  }
};

const runTests = async () => {
  try {
    await sequelize.authenticate();
    console.log('Testing passwords for seeded users...');
    
    await testActualLogin('admin@pcalley.com', 'admin123');
    await testActualLogin('starosa_admin@pcalley.com', 'branch123');
    await testActualLogin('starosa_staff@pcalley.com', 'staff123');
  } catch (err) {
    console.error('Database connection failed:', err.message);
  } finally {
    process.exit(0);
  }
};

runTests();
