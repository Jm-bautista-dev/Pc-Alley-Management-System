require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('./src/db');
const { User } = require('./src/models');

async function main() {
  try {
    await sequelize.authenticate();

    const username = 'admin';
    const password = 'admin123';

    const existing = await User.findOne({ where: { username } });

    if (existing) {
      const hashed = await bcrypt.hash(password, 10);
      await existing.update({ password: hashed, role: 'super_admin' });
      console.log('✅ Admin account UPDATED');
    } else {
      const hashed = await bcrypt.hash(password, 10);
      await User.create({ username, password: hashed, role: 'super_admin', branch_id: null });
      console.log('✅ Admin account CREATED');
    }

    console.log('----------------------------');
    console.log('Username : admin');
    console.log('Password : admin123');
    console.log('Role     : super_admin');
    console.log('----------------------------');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
