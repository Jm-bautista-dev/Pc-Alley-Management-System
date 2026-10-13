const sequelize = require('./index');

async function runMigrations() {
  try {
    console.log('[MIGRATION] Starting safe, non-destructive schema migrations...');

    // 1. Add is_active to users
    const [userCols] = await sequelize.query("SHOW COLUMNS FROM `users` LIKE 'is_active'");
    if (userCols.length === 0) {
      await sequelize.query('ALTER TABLE `users` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1;');
      console.log('✓ Added is_active column to users');
    } else {
      console.log('✓ is_active column already exists in users');
    }

    // 2. Add customer_id, sale_id, void_reason, voided_at to warranties
    const [wCustCols] = await sequelize.query("SHOW COLUMNS FROM `warranties` LIKE 'customer_id'");
    if (wCustCols.length === 0) {
      await sequelize.query(`
        ALTER TABLE \`warranties\` 
        ADD COLUMN \`customer_id\` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL, 
        ADD COLUMN \`sale_id\` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL, 
        ADD CONSTRAINT \`fk_warranties_customer\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE, 
        ADD CONSTRAINT \`fk_warranties_sale\` FOREIGN KEY (\`sale_id\`) REFERENCES \`sales\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE;
      `);
      console.log('✓ Added customer_id and sale_id to warranties');
    } else {
      console.log('✓ customer_id already exists in warranties');
    }

    const [wVoidCols] = await sequelize.query("SHOW COLUMNS FROM `warranties` LIKE 'void_reason'");
    if (wVoidCols.length === 0) {
      await sequelize.query("ALTER TABLE `warranties` ADD COLUMN `void_reason` TEXT NULL, ADD COLUMN `voided_at` DATETIME NULL;");
      console.log('✓ Added void_reason and voided_at to warranties');
    }

    // 3. Create returns table if not exists
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`returns\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`return_number\` VARCHAR(50) NOT NULL UNIQUE,
        \`sale_id\` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        \`branch_id\` INT NOT NULL,
        \`customer_id\` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
        \`customer_name\` VARCHAR(255) NOT NULL,
        \`status\` ENUM('Requested', 'Received for Inspection', 'Approved', 'Rejected') NOT NULL DEFAULT 'Requested',
        \`disposition\` ENUM('refund', 'exchange', 'restock_review') NOT NULL DEFAULT 'restock_review',
        \`items\` JSON NOT NULL,
        \`reason\` VARCHAR(255) NOT NULL,
        \`condition_note\` VARCHAR(255) NULL,
        \`notes\` TEXT NULL,
        \`restock_resellable\` TINYINT(1) NOT NULL DEFAULT 0,
        \`refund_amount\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`requested_by\` INT NOT NULL,
        \`reviewed_by\` INT NULL,
        \`reviewed_at\` DATETIME NULL,
        \`createdAt\` DATETIME NOT NULL,
        \`updatedAt\` DATETIME NOT NULL,
        FOREIGN KEY (\`sale_id\`) REFERENCES \`sales\` (\`id\`) ON UPDATE CASCADE,
        FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`id\`) ON UPDATE CASCADE,
        FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY (\`requested_by\`) REFERENCES \`users\` (\`id\`) ON UPDATE CASCADE,
        FOREIGN KEY (\`reviewed_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
    console.log('✓ returns table verified/created');

    // 4. Ensure stocktransfers has reference_number and audit columns
    const [transCols] = await sequelize.query("SHOW COLUMNS FROM `stocktransfers` LIKE 'reference_number'");
    if (transCols.length === 0) {
      await sequelize.query(`
        ALTER TABLE \`stocktransfers\` 
        ADD COLUMN \`reference_number\` VARCHAR(50) NULL UNIQUE, 
        ADD COLUMN \`dispatched_by\` INT NULL, 
        ADD COLUMN \`received_by\` INT NULL, 
        ADD COLUMN \`dispatched_at\` DATETIME NULL, 
        ADD COLUMN \`received_at\` DATETIME NULL;
      `);
      console.log('✓ Added reference_number and audit columns to stocktransfers');
    }

    // Update status enum of stocktransfers
    await sequelize.query(`
      ALTER TABLE \`stocktransfers\` 
      MODIFY COLUMN \`status\` ENUM('Draft', 'Submitted', 'Pending', 'In-Transit', 'Dispatched', 'Received', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending';
    `);
    console.log('✓ stocktransfers status enum updated');

    // 5. Add missing columns to sales if not present
    const [saleTypeCols] = await sequelize.query("SHOW COLUMNS FROM `sales` LIKE 'sale_type'");
    if (saleTypeCols.length === 0) {
      await sequelize.query("ALTER TABLE `sales` ADD COLUMN `sale_type` ENUM('product', 'service', 'mixed') NOT NULL DEFAULT 'product';");
    }
    const [prodAmtCols] = await sequelize.query("SHOW COLUMNS FROM `sales` LIKE 'product_amount'");
    if (prodAmtCols.length === 0) {
      await sequelize.query("ALTER TABLE `sales` ADD COLUMN `product_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00;");
    }
    const [servAmtCols] = await sequelize.query("SHOW COLUMNS FROM `sales` LIKE 'service_amount'");
    if (servAmtCols.length === 0) {
      await sequelize.query("ALTER TABLE `sales` ADD COLUMN `service_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00;");
    }
    const [amtPaidCols] = await sequelize.query("SHOW COLUMNS FROM `sales` LIKE 'amountPaid'");
    if (amtPaidCols.length === 0) {
      await sequelize.query("ALTER TABLE `sales` ADD COLUMN `amountPaid` DECIMAL(12, 2) NULL DEFAULT 0.00;");
    }
    const [changeAmtCols] = await sequelize.query("SHOW COLUMNS FROM `sales` LIKE 'changeAmount'");
    if (changeAmtCols.length === 0) {
      await sequelize.query("ALTER TABLE `sales` ADD COLUMN `changeAmount` DECIMAL(12, 2) NULL DEFAULT 0.00;");
    }

    // 6. Ensure services has all expected model columns
    const [serviceCols] = await sequelize.query("SHOW COLUMNS FROM `services`");
    const existingColNames = serviceCols.map(c => c.Field);

    if (!existingColNames.includes('pricing_type')) {
      await sequelize.query("ALTER TABLE `services` ADD COLUMN `pricing_type` ENUM('fixed', 'variable', 'custom', 'hourly', 'quote', 'tiered') NOT NULL DEFAULT 'fixed';");
    }
    if (!existingColNames.includes('base_price')) {
      await sequelize.query("ALTER TABLE `services` ADD COLUMN `base_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00;");
      if (existingColNames.includes('price')) {
        await sequelize.query("UPDATE `services` SET `base_price` = `price` WHERE `base_price` = 0;");
      }
    }
    if (!existingColNames.includes('estimated_duration_mins')) {
      await sequelize.query("ALTER TABLE `services` ADD COLUMN `estimated_duration_mins` INT NULL DEFAULT 60;");
      if (existingColNames.includes('estimated_duration')) {
        await sequelize.query("UPDATE `services` SET `estimated_duration_mins` = `estimated_duration` WHERE `estimated_duration_mins` = 60 AND `estimated_duration` IS NOT NULL;");
      }
    }
    if (!existingColNames.includes('requires_device_info')) {
      await sequelize.query("ALTER TABLE `services` ADD COLUMN `requires_device_info` TINYINT(1) NOT NULL DEFAULT 1;");
    }
    if (!existingColNames.includes('created_by')) {
      await sequelize.query("ALTER TABLE `services` ADD COLUMN `created_by` INT NULL;");
    }
    if (!existingColNames.includes('updated_by')) {
      await sequelize.query("ALTER TABLE `services` ADD COLUMN `updated_by` INT NULL;");
    }
    if (!existingColNames.includes('created_at')) {
      await sequelize.query("ALTER TABLE `services` ADD COLUMN `created_at` DATETIME NULL;");
      if (existingColNames.includes('createdAt')) {
        await sequelize.query("UPDATE `services` SET `created_at` = `createdAt` WHERE `created_at` IS NULL;");
      }
    }
    if (!existingColNames.includes('updated_at')) {
      await sequelize.query("ALTER TABLE `services` ADD COLUMN `updated_at` DATETIME NULL;");
      if (existingColNames.includes('updatedAt')) {
        await sequelize.query("UPDATE `services` SET `updated_at` = `updatedAt` WHERE `updated_at` IS NULL;");
      }
    }
    if (!existingColNames.includes('deleted_at')) {
      await sequelize.query("ALTER TABLE `services` ADD COLUMN `deleted_at` DATETIME NULL;");
    }

    // 7. Ensure saleitems has all expected model columns
    const [saleItemCols] = await sequelize.query("SHOW COLUMNS FROM `saleitems`");
    const saleItemColNames = saleItemCols.map(c => c.Field);
    if (!saleItemColNames.includes('item_type')) {
      await sequelize.query("ALTER TABLE `saleitems` ADD COLUMN `item_type` ENUM('product', 'service') NOT NULL DEFAULT 'product';");
      console.log('✓ Added item_type to saleitems');
    }
    if (!saleItemColNames.includes('serviceId')) {
      await sequelize.query("ALTER TABLE `saleitems` ADD COLUMN `serviceId` INT NULL;");
    }
    if (!saleItemColNames.includes('serviceJobId')) {
      await sequelize.query("ALTER TABLE `saleitems` ADD COLUMN `serviceJobId` INT NULL;");
    }
    if (!saleItemColNames.includes('priceOverrideReason')) {
      await sequelize.query("ALTER TABLE `saleitems` ADD COLUMN `priceOverrideReason` TEXT NULL;");
    }
    if (!saleItemColNames.includes('approvedBy')) {
      await sequelize.query("ALTER TABLE `saleitems` ADD COLUMN `approvedBy` INT NULL;");
    }

    console.log('[MIGRATION] All migrations executed successfully.');
  } catch (err) {
    console.error('[MIGRATION_ERROR]', err);
    throw err;
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigrations;
