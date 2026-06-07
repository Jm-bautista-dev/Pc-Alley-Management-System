const { User } = require('../src/models');
const sequelize = require('../src/db');

const checkUsers = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');
    const users = await User.findAll({
      attributes: ['id', 'username', 'role', 'branch_id']
    });
    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`- ${u.username} (Role: ${u.role}, Branch: ${u.branch_id})`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err.message);
    process.exit(1);
  }
};

checkUsers();
