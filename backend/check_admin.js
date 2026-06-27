require('dotenv').config();
const sequelize = require('./src/db');
const { User } = require('./src/models');

async function main() {
  try {
    await sequelize.authenticate();

    const users = await User.findAll({
      attributes: ['id', 'username', 'role', 'branch_id'],
    });

    if (users.length === 0) {
      console.log('❌ No users found in the database!');
    } else {
      console.log('✅ Users in database:');
      console.log('----------------------------');
      users.forEach(u => {
        console.log(`ID: ${u.id} | Username: ${u.username} | Role: ${u.role}`);
      });
      console.log('----------------------------');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
