const sequelize = require('./src/db');

async function run() {
  try {
    console.log('Altering Products table...');
    // Add columns if they don't exist
    const [cols] = await sequelize.query("SHOW COLUMNS FROM `Products` LIKE 'product_image'");
    if (cols.length === 0) {
      await sequelize.query("ALTER TABLE `Products` ADD COLUMN `product_image` VARCHAR(255) NULL");
      console.log('Added product_image column');
    }
    
    const [maxReqCol] = await sequelize.query("SHOW COLUMNS FROM `Products` LIKE 'max_request_quantity'");
    if (maxReqCol.length === 0) {
      await sequelize.query("ALTER TABLE `Products` ADD COLUMN `max_request_quantity` INT NULL");
      console.log('Added max_request_quantity column');
    }
    
    const [minReqCol] = await sequelize.query("SHOW COLUMNS FROM `Products` LIKE 'min_request_quantity'");
    if (minReqCol.length === 0) {
      await sequelize.query("ALTER TABLE `Products` ADD COLUMN `min_request_quantity` INT NULL");
      console.log('Added min_request_quantity column');
    }

    const [availCol] = await sequelize.query("SHOW COLUMNS FROM `Products` LIKE 'available_quantity'");
    if (availCol.length === 0) {
      await sequelize.query("ALTER TABLE `Products` ADD COLUMN `available_quantity` INT DEFAULT 100");
      console.log('Added available_quantity column');
    }

    const [reservedCol] = await sequelize.query("SHOW COLUMNS FROM `Products` LIKE 'reserved_quantity'");
    if (reservedCol.length === 0) {
      await sequelize.query("ALTER TABLE `Products` ADD COLUMN `reserved_quantity` INT DEFAULT 0");
      console.log('Added reserved_quantity column');
    }

    // Now, run sequelize.sync to create the ProductRequest table if it doesn't exist
    await sequelize.sync({ alter: true });
    console.log('Sequelize sync completed successfully.');

    // Update notifications table enum to include 'product_request' and product_request-related statuses
    console.log('Updating notifications type enum...');
    await sequelize.query("ALTER TABLE `notifications` MODIFY COLUMN `type` ENUM('info','warning','success','error','restock_request','product_request') DEFAULT 'info';");
    console.log('Notifications enum updated.');

    // Update stockmovements table enum to include 'TRANSFER'
    console.log('Updating stockmovements type enum...');
    await sequelize.query("ALTER TABLE `stockmovements` MODIFY COLUMN `type` ENUM('RESTOCK', 'SALE', 'ADJUSTMENT', 'TRANSFER') NOT NULL;");
    console.log('Stockmovements type enum updated.');

  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    process.exit();
  }
}

run();
