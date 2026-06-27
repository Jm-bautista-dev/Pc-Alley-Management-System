const sequelize = require('./index');

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log('DATABASE: Connected for migration.');

    // Check if the column already exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'products' 
        AND COLUMN_NAME = 'product_image'
    `);

    if (results.length === 0) {
      console.log("MIGRATION: Adding 'product_image' column to 'products' table...");
      await sequelize.query('ALTER TABLE `products` ADD COLUMN `product_image` VARCHAR(255) NULL AFTER `image_url`;');
      console.log("MIGRATION: 'product_image' column added successfully.");
    } else {
      console.log("MIGRATION: Column 'product_image' already exists in 'products' table.");
    }

    process.exit(0);
  } catch (err) {
    console.error('MIGRATION ERROR:', err.message);
    process.exit(1);
  }
}

runMigration();
