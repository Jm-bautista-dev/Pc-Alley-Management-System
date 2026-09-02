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
  } catch (error) {
    console.warn(`DATABASE: Schema migration skipped or failed: ${error.message}`);
  }
};

module.exports = migrateSchema;
