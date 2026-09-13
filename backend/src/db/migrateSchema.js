const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

const addColumnIfMissing = async (queryInterface, tableName, columnName, definition) => {
  try {
    const table = await queryInterface.describeTable(tableName);
    if (table[columnName]) {
      return;
    }
    await queryInterface.addColumn(tableName, columnName, definition);
    console.log(`DATABASE: Added ${tableName}.${columnName} column.`);
  } catch (err) {
    console.warn(`DATABASE: Column add check failed for ${tableName}.${columnName}: ${err.message}`);
  }
};

const migrateSchema = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    const userTable = await queryInterface.describeTable('users');
    if (!userTable.first_name) {
      await addColumnIfMissing(queryInterface, 'users', 'first_name', {
        type: DataTypes.STRING,
        allowNull: true
      });
    }
    if (!userTable.last_name) {
      await addColumnIfMissing(queryInterface, 'users', 'last_name', {
        type: DataTypes.STRING,
        allowNull: true
      });
    }

    if (userTable.full_name) {
      console.log('DATABASE: Found full_name column in users. Starting backfill...');
      const users = await sequelize.query("SELECT id, full_name FROM users", { type: sequelize.QueryTypes.SELECT });
      for (const u of users) {
        let first = 'Admin';
        let last = 'User';
        if (u.full_name) {
          const parts = u.full_name.trim().split(/\s+/);
          if (parts.length > 1) {
            first = parts[0];
            last = parts.slice(1).join(' ');
          } else {
            first = parts[0] || 'Admin';
            last = 'User';
          }
        }
        await sequelize.query("UPDATE users SET first_name = ?, last_name = ? WHERE id = ?", {
          replacements: [first, last, u.id]
        });
      }
      console.log('DATABASE: Successfully backfilled first_name/last_name.');
    }
  } catch (error) {
    console.warn(`DATABASE: User migration check failed: ${error.message}`);
  }

  try {
    await addColumnIfMissing(queryInterface, 'products', 'product_image', {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'products', 'max_request_quantity', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'products', 'min_request_quantity', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'products', 'available_quantity', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100
    });
    await addColumnIfMissing(queryInterface, 'products', 'reserved_quantity', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await addColumnIfMissing(queryInterface, 'products', 'branch_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'branches', key: 'id' }
    });
    await addColumnIfMissing(queryInterface, 'notifications', 'branch_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'branches', key: 'id' }
    });
    await addColumnIfMissing(queryInterface, 'restockrequests', 'processed_at', {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'sales', 'amountPaid', {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0.00
    });
    await addColumnIfMissing(queryInterface, 'sales', 'changeAmount', {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0.00
    });
    await addColumnIfMissing(queryInterface, 'products', 'deleted_at', {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'products', 'brand_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'brands', key: 'id' }
    });
    await addColumnIfMissing(queryInterface, 'products', 'barcode', {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'products', 'specifications', {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'products', 'status', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active'
    });
    await addColumnIfMissing(queryInterface, 'categories', 'slug', {
      type: DataTypes.STRING,
      allowNull: true
    });

    // Backfill Category Slugs
    const categories = await sequelize.query("SELECT id, name, slug FROM categories", { type: sequelize.QueryTypes.SELECT });
    for (const cat of categories) {
      if (!cat.slug) {
        const slug = slugify(cat.name);
        await sequelize.query("UPDATE categories SET slug = ? WHERE id = ?", {
          replacements: [slug, cat.id]
        });
      }
    }

    // Ensure "Uncategorized" category exists
    const uncatRows = await sequelize.query("SELECT id FROM categories WHERE name = 'Uncategorized'", { type: sequelize.QueryTypes.SELECT });
    if (uncatRows.length === 0) {
      await sequelize.query("INSERT INTO categories (name, slug, createdAt, updatedAt) VALUES ('Uncategorized', 'uncategorized', NOW(), NOW())");
      console.log("DATABASE: Created default 'Uncategorized' category.");
    }

    // Ensure "Unassigned" brand exists
    const brandRows = await sequelize.query("SELECT id FROM brands WHERE name = 'Unassigned'", { type: sequelize.QueryTypes.SELECT });
    if (brandRows.length === 0) {
      await sequelize.query("INSERT INTO brands (name, slug, status, created_at, updated_at) VALUES ('Unassigned', 'unassigned', 'active', NOW(), NOW())");
      console.log("DATABASE: Created default 'Unassigned' brand.");
    }

    // ── Migrate Inventories → branch_products ──
    const rawTables = await queryInterface.showAllTables();
    const allTables = rawTables.map(t => {
      if (typeof t === 'string') return t.toLowerCase();
      if (typeof t === 'object' && t !== null) {
        return (t.tableName || Object.values(t)[0] || '').toString().toLowerCase();
      }
      return String(t).toLowerCase();
    });

    let hasBranchProducts = allTables.includes('branch_products');
    const legacyTableName = allTables.includes('inventories')
      ? 'inventories'
      : (allTables.includes('inventory') ? 'inventory' : null);

    if (legacyTableName && !hasBranchProducts) {
      try {
        await sequelize.query(`RENAME TABLE \`${legacyTableName}\` TO \`branch_products\``);
        console.log(`DATABASE: Renamed ${legacyTableName} → branch_products.`);
        hasBranchProducts = true;
      } catch (renameErr) {
        console.warn(`DATABASE: Failed to rename ${legacyTableName} to branch_products:`, renameErr.message);
      }
    }

    if (!hasBranchProducts) {
      try {
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS \`branch_products\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`product_id\` INT NOT NULL,
            \`branch_id\` INT NOT NULL,
            \`stock\` INT NOT NULL DEFAULT 0,
            \`price\` DECIMAL(10, 2) DEFAULT NULL,
            \`enabled\` TINYINT(1) NOT NULL DEFAULT 1,
            \`low_stock_threshold\` INT NOT NULL DEFAULT 5,
            UNIQUE KEY \`product_branch_unique\` (\`product_id\`, \`branch_id\`),
            FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('DATABASE: Created branch_products table with foreign keys.');
        hasBranchProducts = true;
      } catch (createWithFkErr) {
        console.warn('DATABASE: Retrying branch_products creation without foreign keys:', createWithFkErr.message);
        try {
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS \`branch_products\` (
              \`id\` INT AUTO_INCREMENT PRIMARY KEY,
              \`product_id\` INT NOT NULL,
              \`branch_id\` INT NOT NULL,
              \`stock\` INT NOT NULL DEFAULT 0,
              \`price\` DECIMAL(10, 2) DEFAULT NULL,
              \`enabled\` TINYINT(1) NOT NULL DEFAULT 1,
              \`low_stock_threshold\` INT NOT NULL DEFAULT 5,
              UNIQUE KEY \`product_branch_unique\` (\`product_id\`, \`branch_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
          `);
          console.log('DATABASE: Created branch_products table without foreign keys.');
          hasBranchProducts = true;
        } catch (createErr) {
          console.error('DATABASE: Could not create branch_products table:', createErr.message);
        }
      }
    }

    if (hasBranchProducts) {
      // Ensure all columns exist
      try {
        const bpCols = await queryInterface.describeTable('branch_products');
        if (bpCols.quantity && !bpCols.stock) {
          try {
            await queryInterface.renameColumn('branch_products', 'quantity', 'stock');
            console.log('DATABASE: Renamed branch_products.quantity → stock.');
          } catch (e) {
            console.warn('DATABASE: Column rename quantity->stock skipped:', e.message);
          }
        }
      } catch (e) {
        console.warn('DATABASE: Could not describe branch_products table:', e.message);
      }

      await addColumnIfMissing(queryInterface, 'branch_products', 'stock', {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
      await addColumnIfMissing(queryInterface, 'branch_products', 'price', {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null
      });
      await addColumnIfMissing(queryInterface, 'branch_products', 'enabled', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
      await addColumnIfMissing(queryInterface, 'branch_products', 'low_stock_threshold', {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5
      });

      // Ensure enabled is not null
      try {
        await sequelize.query("UPDATE `branch_products` SET `enabled` = 1 WHERE `enabled` IS NULL");
      } catch (e) {
        // ignore
      }

      // Automatically populate missing branch_products entries for existing products and branches
      try {
        const branches = await sequelize.query("SELECT id FROM `branches`", { type: sequelize.QueryTypes.SELECT });
        const products = await sequelize.query("SELECT id FROM `products` WHERE `deleted_at` IS NULL", { type: sequelize.QueryTypes.SELECT });
        for (const b of branches) {
          for (const p of products) {
            await sequelize.query(`
              INSERT IGNORE INTO \`branch_products\` (\`product_id\`, \`branch_id\`, \`stock\`, \`enabled\`, \`low_stock_threshold\`)
              VALUES (?, ?, 0, 1, 5)
            `, { replacements: [p.id, b.id] });
          }
        }
      } catch (e) {
        console.warn('DATABASE: Could not backfill branch_products rows:', e.message);
      }
    }

    // ── Service Sales & Work Orders Migration ─────────────────────────────
    try {
      // 1. Create services table if missing
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`services\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`name\` VARCHAR(255) NOT NULL UNIQUE,
          \`category\` VARCHAR(100) NOT NULL DEFAULT 'Other',
          \`description\` TEXT NULL,
          \`pricing_type\` ENUM('fixed', 'variable', 'custom') NOT NULL DEFAULT 'fixed',
          \`base_price\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          \`estimated_duration_mins\` INT DEFAULT 60,
          \`requires_device_info\` TINYINT(1) NOT NULL DEFAULT 1,
          \`status\` ENUM('active', 'inactive', 'archived') NOT NULL DEFAULT 'active',
          \`created_by\` INT NULL,
          \`updated_by\` INT NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          \`deleted_at\` DATETIME NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 2. Create service_jobs table if missing
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`service_jobs\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`job_number\` VARCHAR(50) NOT NULL UNIQUE,
          \`customer_id\` CHAR(36) NULL,
          \`customer_name\` VARCHAR(255) NOT NULL DEFAULT 'Walk-in Customer',
          \`customer_phone\` VARCHAR(50) NULL,
          \`service_id\` INT NOT NULL,
          \`service_name\` VARCHAR(255) NOT NULL,
          \`branch_id\` INT NOT NULL,
          \`device_type\` VARCHAR(100) DEFAULT 'Desktop PC',
          \`device_specs\` TEXT NULL,
          \`serial_number\` VARCHAR(100) NULL,
          \`reported_issue\` TEXT NULL,
          \`diagnosis\` TEXT NULL,
          \`status\` ENUM('received', 'diagnosing', 'waiting_for_approval', 'in_progress', 'ready_for_release', 'completed', 'cancelled') NOT NULL DEFAULT 'received',
          \`estimated_price\` DECIMAL(12, 2) DEFAULT 0.00,
          \`final_price\` DECIMAL(12, 2) DEFAULT 0.00,
          \`price_override_reason\` TEXT NULL,
          \`technician_id\` INT NULL,
          \`technician_name\` VARCHAR(255) NULL,
          \`sale_id\` CHAR(36) NULL,
          \`invoice_number\` VARCHAR(100) NULL,
          \`customer_approved\` TINYINT(1) NOT NULL DEFAULT 0,
          \`received_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`approved_at\` DATETIME NULL,
          \`completed_at\` DATETIME NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 3. Alter sales table
      await addColumnIfMissing(queryInterface, 'sales', 'sale_type', {
        type: DataTypes.ENUM('product', 'service', 'mixed'),
        allowNull: false,
        defaultValue: 'product'
      });
      await addColumnIfMissing(queryInterface, 'sales', 'product_amount', {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      });
      await addColumnIfMissing(queryInterface, 'sales', 'service_amount', {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      });

      // 4. Alter saleitems table
      await addColumnIfMissing(queryInterface, 'saleitems', 'item_type', {
        type: DataTypes.ENUM('product', 'service'),
        allowNull: false,
        defaultValue: 'product'
      });
      await addColumnIfMissing(queryInterface, 'saleitems', 'serviceId', {
        type: DataTypes.INTEGER,
        allowNull: true
      });
      await addColumnIfMissing(queryInterface, 'saleitems', 'serviceJobId', {
        type: DataTypes.INTEGER,
        allowNull: true
      });
      await addColumnIfMissing(queryInterface, 'saleitems', 'priceOverrideReason', {
        type: DataTypes.TEXT,
        allowNull: true
      });
      await addColumnIfMissing(queryInterface, 'saleitems', 'approvedBy', {
        type: DataTypes.INTEGER,
        allowNull: true
      });

      // 5. Seed default PC technical services if catalog is empty
      const existingServices = await sequelize.query("SELECT COUNT(*) AS cnt FROM `services`", { type: sequelize.QueryTypes.SELECT });
      if (parseInt(existingServices[0]?.cnt || 0) === 0) {
        const defaultServices = [
          ['PC Diagnostic & Inspection', 'Diagnostics', 'Comprehensive component-level inspection and stress testing to isolate hardware or thermal faults.', 'variable', 500.00, 45, 1],
          ['Operating System Installation & Driver Setup', 'Software', 'Clean install of Windows/Linux OS, latest WHQL certified hardware drivers, and essential utilities.', 'fixed', 800.00, 60, 1],
          ['Deep Cleaning & Thermal Paste Replacement', 'Maintenance', 'Thorough dust removal, fan ultrasonic cleaning, and high-performance thermal paste application (Arctic MX-4/Noctua).', 'fixed', 650.00, 45, 1],
          ['Custom Gaming PC Assembly & Cable Management', 'Assembly', 'Full system assembly from bare parts, professional routing, cable dressing, and initial POST/BIOS setup.', 'variable', 1500.00, 120, 1],
          ['Hardware Component Upgrade & Installation', 'Installation', 'Safe installation of new GPU, SSD/HDD, RAM modules, CPU cooler, or PSU with verification tests.', 'fixed', 350.00, 30, 1],
          ['Component-Level Board & Circuit Repair', 'Repair', 'Precision soldering and trace repair for motherboards, GPUs, or power delivery circuits.', 'custom', 1200.00, 180, 1],
          ['Virus, Malware & Rootkit Removal', 'Software', 'Deep system scanning, malicious software neutralization, security patch installation, and system registry cleaning.', 'fixed', 500.00, 45, 1],
          ['Data Recovery & Drive Cloning', 'Software', 'Extraction of files from failing storage drives or full bit-by-bit system migration to a new high-speed NVMe SSD.', 'variable', 1000.00, 90, 1]
        ];

        for (const s of defaultServices) {
          await sequelize.query(`
            INSERT INTO \`services\` (\`name\`, \`category\`, \`description\`, \`pricing_type\`, \`base_price\`, \`estimated_duration_mins\`, \`requires_device_info\`, \`status\`)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
          `, { replacements: s });
        }
        console.log('DATABASE: Seeded default PC technical service catalog.');
      }
    } catch (sErr) {
      console.warn('DATABASE: Service tables migration warning:', sErr.message);
    }

    // 6. Warranties void_reason and voided_at columns
    try {
      await addColumnIfMissing(queryInterface, 'warranties', 'void_reason', {
        type: DataTypes.TEXT,
        allowNull: true
      });
      await addColumnIfMissing(queryInterface, 'warranties', 'voided_at', {
        type: DataTypes.DATE,
        allowNull: true
      });
    } catch (wErr) {
      console.warn('DATABASE: Warranties table migration warning:', wErr.message);
    }

    // 7. Product Requests Workflow columns migration
    try {
      await addColumnIfMissing(queryInterface, 'product_requests', 'source_branch_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'branches', key: 'id' }
      });
      await addColumnIfMissing(queryInterface, 'product_requests', 'approval_notes', {
        type: DataTypes.TEXT,
        allowNull: true
      });
      await addColumnIfMissing(queryInterface, 'product_requests', 'fulfilled_by', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' }
      });
      await addColumnIfMissing(queryInterface, 'product_requests', 'fulfilled_at', {
        type: DataTypes.DATE,
        allowNull: true
      });
      await addColumnIfMissing(queryInterface, 'product_requests', 'quantity_fulfilled', {
        type: DataTypes.INTEGER,
        allowNull: true
      });
      await addColumnIfMissing(queryInterface, 'product_requests', 'received_by', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' }
      });
      await addColumnIfMissing(queryInterface, 'product_requests', 'received_at', {
        type: DataTypes.DATE,
        allowNull: true
      });
      await addColumnIfMissing(queryInterface, 'product_requests', 'branch_approved_by', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' }
      });
      await addColumnIfMissing(queryInterface, 'product_requests', 'branch_approved_at', {
        type: DataTypes.DATE,
        allowNull: true
      });
      await addColumnIfMissing(queryInterface, 'product_requests', 'branch_approval_notes', {
        type: DataTypes.TEXT,
        allowNull: true
      });

      // Alter status to VARCHAR(50) so it supports modern PENDING, APPROVED, PROCESSING, FULFILLED, REJECTED, CANCELLED
      try {
        await sequelize.query("ALTER TABLE `product_requests` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING'");
        console.log('DATABASE: Updated product_requests.status column to VARCHAR(50).');
      } catch (alterErr) {
        console.warn('DATABASE: Status column alter skipped/warning:', alterErr.message);
      }

      // Ensure stockmovements type includes TRANSFER
      try {
        await sequelize.query("ALTER TABLE `stockmovements` MODIFY COLUMN `type` ENUM('RESTOCK', 'SALE', 'ADJUSTMENT', 'TRANSFER') NOT NULL");
        console.log('DATABASE: Ensured stockmovements.type ENUM includes TRANSFER.');
      } catch (smErr) {
        console.warn('DATABASE: Stockmovements type alter skipped/warning:', smErr.message);
      }
    } catch (prErr) {
      console.warn('DATABASE: Product requests migration warning:', prErr.message);
    }

    // 8. Benchmark Runs & Results Tables Migration
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`benchmark_runs\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`scope_type\` ENUM('all', 'branch', 'category', 'product') NOT NULL DEFAULT 'all',
          \`scope_id\` INT NULL,
          \`branch_id\` INT NULL,
          \`start_date\` DATE NOT NULL,
          \`end_date\` DATE NOT NULL,
          \`frequency\` VARCHAR(20) NOT NULL DEFAULT 'monthly',
          \`horizon\` VARCHAR(20) DEFAULT '30d',
          \`validation_method\` VARCHAR(50) NOT NULL DEFAULT 'walk_forward',
          \`validation_windows\` INT NOT NULL DEFAULT 0,
          \`status\` ENUM('completed', 'insufficient_data', 'failed') NOT NULL DEFAULT 'completed',
          \`best_model\` VARCHAR(100) NULL,
          \`best_wape\` DECIMAL(6, 2) NULL,
          \`best_mae\` DECIMAL(12, 2) NULL,
          \`best_rmse\` DECIMAL(12, 2) NULL,
          \`best_bias\` DECIMAL(12, 2) NULL,
          \`reliability\` VARCHAR(20) DEFAULT 'Moderate',
          \`recommendation_notes\` TEXT NULL,
          \`created_by\` INT NULL,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
          FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`benchmark_results\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`benchmark_run_id\` INT NOT NULL,
          \`model_id\` VARCHAR(50) NOT NULL,
          \`model_name\` VARCHAR(100) NOT NULL,
          \`model_version\` VARCHAR(20) NOT NULL DEFAULT 'v1.0',
          \`mae\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          \`rmse\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          \`mape\` DECIMAL(6, 2) NULL,
          \`wape\` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
          \`bias\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          \`accuracy\` DECIMAL(5, 2) NULL,
          \`reliability\` VARCHAR(20) NOT NULL DEFAULT 'Moderate',
          \`rank\` INT NOT NULL DEFAULT 1,
          \`validation_windows\` INT NOT NULL DEFAULT 0,
          \`status\` VARCHAR(20) NOT NULL DEFAULT 'evaluated',
          \`failure_reason\` VARCHAR(255) NULL,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (\`benchmark_run_id\`) REFERENCES \`benchmark_runs\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('DATABASE: Verified benchmark_runs and benchmark_results tables.');
    } catch (bmErr) {
      console.warn('DATABASE: Benchmark tables migration warning:', bmErr.message);
    }

    // 9. Bundles, Bundle Items & Bundle Branches Tables Migration
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`bundles\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`name\` VARCHAR(200) NOT NULL,
          \`description\` TEXT NULL,
          \`price\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          \`status\` VARCHAR(50) NOT NULL DEFAULT 'active',
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`bundle_items\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`bundle_id\` INT NOT NULL,
          \`product_id\` INT NOT NULL,
          \`quantity\` INT NOT NULL DEFAULT 1,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_bundle_items_bundle\` (\`bundle_id\`),
          INDEX \`idx_bundle_items_product\` (\`product_id\`),
          FOREIGN KEY (\`bundle_id\`) REFERENCES \`bundles\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`bundle_branches\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`bundle_id\` INT NOT NULL,
          \`branch_id\` INT NOT NULL,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY \`unique_bundle_branch\` (\`bundle_id\`, \`branch_id\`),
          FOREIGN KEY (\`bundle_id\`) REFERENCES \`bundles\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('DATABASE: Verified bundles, bundle_items, and bundle_branches tables.');
    } catch (bErr) {
      console.warn('DATABASE: Bundles tables migration warning:', bErr.message);
    }

    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`user_sessions\` (
          \`id\` VARCHAR(64) PRIMARY KEY,
          \`user_id\` INT NOT NULL,
          \`token_hash\` VARCHAR(64) NOT NULL,
          \`ip_address\` VARCHAR(45) NULL,
          \`user_agent\` VARCHAR(500) NULL,
          \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
          \`expires_at\` DATETIME NOT NULL,
          \`last_activity_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_user_sessions_user\` (\`user_id\`),
          INDEX \`idx_user_sessions_token_hash\` (\`token_hash\`),
          INDEX \`idx_user_sessions_active\` (\`is_active\`),
          INDEX \`idx_user_sessions_expires\` (\`expires_at\`),
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('DATABASE: Verified user_sessions table.');
    } catch (sErr) {
      console.warn('DATABASE: user_sessions table migration warning:', sErr.message);
    }

    // ── Normalized Roles & UserRoles Migration ─────────────────────────────
    try {
      // 1. Create roles table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`roles\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`name\` VARCHAR(50) NOT NULL UNIQUE,
          \`display_name\` VARCHAR(100) NOT NULL,
          \`description\` TEXT NULL,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 2. Seed canonical roles
      const canonicalRoles = [
        {
          name: 'super_admin',
          display_name: 'Super Admin',
          description: 'Full global system authority across all branches. Manages all products, global stock requisitions, high-level approvals, financial reports, and branch staff provision.'
        },
        {
          name: 'branch_admin',
          display_name: 'Branch Manager',
          description: 'Branch-level administrative operations. Approves branch restock requests, creates branch staff accounts, manages branch sales, customer registry, and local inventory stock.'
        },
        {
          name: 'employee',
          display_name: 'Staff Associate',
          description: 'Daily frontline retail and service operations. Processes POS sales terminal transactions, creates draft quotes, logs work order jobs, and submits restock replenishment requests.'
        }
      ];

      for (const cr of canonicalRoles) {
        await sequelize.query(`
          INSERT INTO \`roles\` (\`name\`, \`display_name\`, \`description\`, \`createdAt\`, \`updatedAt\`)
          VALUES (?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            \`display_name\` = VALUES(\`display_name\`),
            \`description\` = VALUES(\`description\`),
            \`updatedAt\` = NOW()
        `, { replacements: [cr.name, cr.display_name, cr.description] });
      }

      // 3. Create user_roles table with foreign keys, unique constraint, and indexes
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`user_roles\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`user_id\` INT NOT NULL,
          \`role_id\` INT NOT NULL,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY \`unique_user_role\` (\`user_id\`, \`role_id\`),
          INDEX \`idx_user_roles_user\` (\`user_id\`),
          INDEX \`idx_user_roles_role\` (\`role_id\`),
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY (\`role_id\`) REFERENCES \`roles\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 4. Safely backfill existing users into user_roles
      const existingUsers = await sequelize.query("SELECT id, role FROM `users`", { type: sequelize.QueryTypes.SELECT });
      const currentRoles = await sequelize.query("SELECT id, name FROM `roles`", { type: sequelize.QueryTypes.SELECT });
      const roleMap = {};
      for (const r of currentRoles) {
        roleMap[r.name.toLowerCase()] = r.id;
      }

      let migratedCount = 0;
      for (const u of existingUsers) {
        const targetRoleId = roleMap[(u.role || 'employee').toLowerCase()] || roleMap['employee'];
        if (targetRoleId) {
          const [insertRes] = await sequelize.query(`
            INSERT IGNORE INTO \`user_roles\` (\`user_id\`, \`role_id\`, \`createdAt\`, \`updatedAt\`)
            VALUES (?, ?, NOW(), NOW())
          `, { replacements: [u.id, targetRoleId] });
          if (insertRes && insertRes.affectedRows > 0) {
            migratedCount += insertRes.affectedRows;
          }
        }
      }

      console.log(`DATABASE: Verified roles & user_roles tables. Migrated/synced ${migratedCount} user role relationships.`);
    } catch (roleErr) {
      console.warn('DATABASE: Roles and user_roles migration warning:', roleErr.message);
    }

    // ── Product, Brand & Category Relationships Migration ──
    try {
      // 1. Ensure categories table has status and deleted_at
      await addColumnIfMissing(queryInterface, 'categories', 'status', {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active'
      });
      await addColumnIfMissing(queryInterface, 'categories', 'deleted_at', {
        type: DataTypes.DATE,
        allowNull: true
      });
      await addColumnIfMissing(queryInterface, 'categories', 'spec_template', {
        type: DataTypes.TEXT,
        allowNull: true
      });

      // 2. Ensure brands table has deleted_at
      await addColumnIfMissing(queryInterface, 'brands', 'deleted_at', {
        type: DataTypes.DATE,
        allowNull: true
      });

      // 3. Ensure foreign keys and indexes on products table
      const [fks] = await sequelize.query(`
        SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, DELETE_RULE
        FROM information_schema.KEY_COLUMN_USAGE kcu
        JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
          ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
          AND kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
        WHERE kcu.TABLE_NAME = 'products'
          AND kcu.TABLE_SCHEMA = DATABASE()
      `);

      // If category_id has CASCADE delete rule, drop to replace with RESTRICT
      const cascadeCatFks = fks.filter(fk => fk.COLUMN_NAME === 'category_id' && fk.DELETE_RULE === 'CASCADE');
      for (const fk of cascadeCatFks) {
        try {
          await sequelize.query(`ALTER TABLE \`products\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
        } catch (dropErr) {
          console.warn(`Could not drop FK ${fk.CONSTRAINT_NAME}:`, dropErr.message);
        }
      }

      // Ensure proper foreign keys with RESTRICT
      const [remainingCatFks] = await sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_NAME = 'products'
          AND COLUMN_NAME = 'category_id'
          AND REFERENCED_TABLE_NAME = 'categories'
          AND TABLE_SCHEMA = DATABASE()
      `);
      if (remainingCatFks.length === 0) {
        await sequelize.query(`
          ALTER TABLE \`products\`
          ADD CONSTRAINT \`fk_products_category\`
          FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE CASCADE
        `);
      }

      const [brandFks] = await sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_NAME = 'products'
          AND COLUMN_NAME = 'brand_id'
          AND REFERENCED_TABLE_NAME = 'brands'
          AND TABLE_SCHEMA = DATABASE()
      `);
      if (brandFks.length === 0) {
        await sequelize.query(`
          ALTER TABLE \`products\`
          ADD CONSTRAINT \`fk_products_brand\`
          FOREIGN KEY (\`brand_id\`) REFERENCES \`brands\` (\`id\`)
          ON DELETE RESTRICT ON UPDATE CASCADE
        `);
      }

      // 4. Ensure indexes on category_id and brand_id
      try {
        await sequelize.query(`CREATE INDEX \`idx_products_category_id\` ON \`products\` (\`category_id\`)`);
      } catch (_) {}
      try {
        await sequelize.query(`CREATE INDEX \`idx_products_brand_id\` ON \`products\` (\`brand_id\`)`);
      } catch (_) {}

      // 5. Seed standard canonical hardware brands if they do not exist
      const canonicalBrands = [
        { name: 'ASUS', slug: 'asus', description: 'Motherboards, graphics cards, laptops, and monitors' },
        { name: 'MSI', slug: 'msi', description: 'Gaming hardware, motherboards, graphics cards, and desktops' },
        { name: 'Gigabyte', slug: 'gigabyte', description: 'Motherboards, graphics cards, and computing components' },
        { name: 'Intel', slug: 'intel', description: 'Processors, motherboards, and solid-state storage' },
        { name: 'AMD', slug: 'amd', description: 'Ryzen processors and Radeon graphics cards' },
        { name: 'NVIDIA', slug: 'nvidia', description: 'GeForce graphics cards and AI accelerators' },
        { name: 'Corsair', slug: 'corsair', description: 'Gaming memory, power supplies, cooling, and peripherals' },
        { name: 'Kingston', slug: 'kingston', description: 'Memory modules, USB drives, and solid-state drives' },
        { name: 'Logitech', slug: 'logitech', description: 'Mice, keyboards, headsets, and streaming gear' },
        { name: 'Samsung', slug: 'samsung', description: 'Memory, SSDs, monitors, and display technology' },
        { name: 'Western Digital', slug: 'western-digital', description: 'Internal and external HDDs and SSDs' },
        { name: 'Seagate', slug: 'seagate', description: 'Hard drives, solid-state drives, and data storage systems' },
        { name: 'Unassigned', slug: 'unassigned', description: 'Default unassigned brand' }
      ];

      for (const b of canonicalBrands) {
        await sequelize.query(`
          INSERT INTO \`brands\` (\`name\`, \`slug\`, \`description\`, \`status\`, \`created_at\`, \`updated_at\`)
          VALUES (?, ?, ?, 'active', NOW(), NOW())
          ON DUPLICATE KEY UPDATE \`status\` = IF(\`status\` IS NULL, 'active', \`status\`)
        `, { replacements: [b.name, b.slug, b.description] });
      }

      // Ensure default 'Uncategorized' category exists
      await sequelize.query(`
        INSERT INTO \`categories\` (\`name\`, \`slug\`, \`status\`, \`createdAt\`, \`updatedAt\`)
        VALUES ('Uncategorized', 'uncategorized', 'active', NOW(), NOW())
        ON DUPLICATE KEY UPDATE \`status\` = IF(\`status\` IS NULL, 'active', \`status\`)
      `);

      // 6. Seed hardware specification templates for canonical categories
      try {
        const { getTemplateForCategory } = require('../utils/hardwareSpecs');
        const allCategories = await sequelize.query("SELECT id, name, spec_template FROM `categories`", { type: sequelize.QueryTypes.SELECT });
        for (const cat of allCategories) {
          if (!cat.spec_template) {
            const matched = getTemplateForCategory(cat.name);
            if (matched && matched.fields) {
              await sequelize.query("UPDATE `categories` SET `spec_template` = ? WHERE `id` = ?", {
                replacements: [JSON.stringify(matched.fields), cat.id]
              });
            }
          }
        }
      } catch (specSeedErr) {
        console.warn('DATABASE: Spec template seeding notice:', specSeedErr.message);
      }

      console.log('DATABASE: Verified Product, Brand, and Category relationships, indexes, and referential constraints.');
    } catch (relErr) {
      console.warn('DATABASE: Product/Brand/Category relationships migration warning:', relErr.message);
    }
  } catch (error) {
    console.warn(`DATABASE: Schema migration skipped or failed: ${error.message}`);
  }
};

module.exports = migrateSchema;
