require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('./src/db');
const { Branch, User } = require('./src/models');

async function upsertUser({ username, password, role, branch_id }) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const existingUser = await User.findOne({ where: { username } });

  if (existingUser) {
    await existingUser.update({
      password: hashedPassword,
      role,
      branch_id: branch_id ?? null,
    });
    return { username, action: 'updated' };
  }

  await User.create({
    username,
    password: hashedPassword,
    role,
    branch_id: branch_id ?? null,
  });

  return { username, action: 'created' };
}

async function main() {
  try {
    await sequelize.authenticate();

    const staCruzBranch = await Branch.findOne({
      where: { name: 'Sta Cruz' },
    });

    if (!staCruzBranch) {
      throw new Error('Branch "Sta Cruz" was not found.');
    }

    const accounts = [
      {
        username: 'superadmin_demo@pcalley.com',
        password: 'Admin123!',
        role: 'super_admin',
        branch_id: null,
      },
      {
        username: 'manager_sta_cruz@branch',
        password: 'Manager123!',
        role: 'branch_admin',
        branch_id: staCruzBranch.id,
      },
      {
        username: 'staff_sta_cruz@branch',
        password: 'Staff123!',
        role: 'employee',
        branch_id: staCruzBranch.id,
      },
    ];

    for (const account of accounts) {
      const result = await upsertUser(account);
      console.log(`${result.action.toUpperCase()}: ${result.username}`);
    }

    console.log('DONE');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
