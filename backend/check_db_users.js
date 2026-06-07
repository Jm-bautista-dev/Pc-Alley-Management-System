const { User } = require('./src/models');
const sequelize = require('./src/db');

async function checkUsers() {
  try {
    await sequelize.authenticate();
    const users = await User.findAll();
    console.log('Total users:', users.length);
    users.forEach(u => {
      console.log(`User: ${u.username}, Role: ${u.role}, Password length: ${u.password.length}, Starts with $2y$ or $2a$: ${u.password.startsWith('$2y$') || u.password.startsWith('$2a$')}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();
