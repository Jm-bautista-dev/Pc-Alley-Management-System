const { User } = require('../src/models');

async function checkRoles() {
  try {
    const users = await User.findAll({ attributes: ['username', 'role'] });
    const roles = [...new Set(users.map(u => u.role))];
    console.log('UNIQUE ROLES IN DATABASE:', roles);
    users.forEach(u => console.log(`${u.username}: ${u.role}`));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkRoles();
