const { User } = require('./src/models');
const bcrypt = require('bcryptjs');
const sequelize = require('./src/db');

async function resetPassword() {
  try {
    await sequelize.sync();
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Update all demo users
    const users = ['admin@pcalley.com', 'branch_a@pcalley.com', 'staff_a@pcalley.com'];
    
    for (const username of users) {
      await User.update({ password: hashedPassword }, { where: { username } });
      console.log(`Password reset for ${username}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

resetPassword();
