const sequelize = require('./src/db');
const { Branch, User, Category } = require('./src/models');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.sync({ force: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Database sync complete (FORCE).');

    // Create Branches
    const branches = await Branch.bulkCreate([
      { name: 'Branch A', location: 'Main Street, Manila', phone: '0917-123-4567' },
      { name: 'Branch B', location: 'Commercial Area, Cebu', phone: '0917-234-5678' },
      { name: 'Branch C', location: 'Downtown, Davao', phone: '0917-345-6789' }
    ]);
    console.log('Branches created.');

    // Create Super Admin
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      username: 'admin@pcalley.com',
      password: hashedAdminPassword,
      role: 'super_admin'
    });
    
    // Create Branch Admin for Branch A
    const hashedBranchPassword = await bcrypt.hash('branch123', 10);
    await User.create({
      username: 'branch_a@pcalley.com',
      password: hashedBranchPassword,
      role: 'branch_admin',
      branch_id: branches[0].id
    });

    // Initial Categories
    await Category.bulkCreate([
      { name: 'PC Components' },
      { name: 'Peripherals' },
      { name: 'Laptops' },
      { name: 'Accessories' }
    ]);

    console.log('Seed data successfully inserted!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
