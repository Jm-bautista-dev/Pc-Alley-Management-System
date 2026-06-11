const bcrypt = require('bcryptjs');
const sequelize = require('./db');
const { Branch, User, Category } = require('./models');

const seed = async () => {
  try {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.sync({ force: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Database sync complete (FORCE).');

    // Create Branches
    const branches = await Branch.bulkCreate([
      { name: 'Sta Rosa', location: 'Sta Rosa, Laguna', phone: '049-123-4567' },
      { name: 'Calamba', location: 'Calamba, Laguna', phone: '049-234-5678' },
      { name: 'Sta Cruz', location: 'Sta Cruz, Laguna', phone: '049-345-6789' }
    ]);
    console.log('Branches created.');

    // Create Super Admin
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      username: 'admin@pcalley.com',
      password: hashedAdminPassword,
      role: 'super_admin'
    });
    
    // Create Branch Admins for each branch
    const hashedBranchPassword = await bcrypt.hash('branch123', 10);
    
    // Sta Rosa Admin
    await User.create({
      username: 'starosa_admin@pcalley.com',
      password: hashedBranchPassword,
      role: 'branch_admin',
      branch_id: branches[0].id
    });

    // Calamba Admin
    await User.create({
      username: 'calamba_admin@pcalley.com',
      password: hashedBranchPassword,
      role: 'branch_admin',
      branch_id: branches[1].id
    });

    // Sta Cruz Admin
    await User.create({
      username: 'stacruz_admin@pcalley.com',
      password: hashedBranchPassword,
      role: 'branch_admin',
      branch_id: branches[2].id
    });

    // Create a staff member for Sta Rosa as an example
    const hashedStaffPassword = await bcrypt.hash('staff123', 10);
    await User.create({
      username: 'starosa_staff@pcalley.com',
      password: hashedStaffPassword,
      role: 'employee',
      branch_id: branches[0].id
    });

    // Initial Categories
    await Category.bulkCreate([
      { name: 'PC Components' },
      { name: 'Peripherals' },
      { name: 'Laptops' },
      { name: 'Accessories' }
    ]);

    console.log('Seed data successfully inserted.');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
