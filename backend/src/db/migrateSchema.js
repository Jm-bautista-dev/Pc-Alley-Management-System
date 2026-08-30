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
  } catch (error) {
    console.warn(`DATABASE: Schema migration skipped or failed: ${error.message}`);
  }
};

module.exports = migrateSchema;
