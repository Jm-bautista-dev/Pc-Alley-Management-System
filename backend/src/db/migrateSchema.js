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
    const allTables = await queryInterface.showAllTables();
    const hasInventories = allTables.map(t => t.toLowerCase()).includes('inventories');
    const hasBranchProducts = allTables.map(t => t.toLowerCase()).includes('branch_products');

    if (hasInventories && !hasBranchProducts) {
      // Rename the table
      await sequelize.query("RENAME TABLE `inventories` TO `branch_products`");
      console.log('DATABASE: Renamed inventories → branch_products.');

      // Rename quantity → stock
      const bpTable = await queryInterface.describeTable('branch_products');
      if (bpTable.quantity && !bpTable.stock) {
        await queryInterface.renameColumn('branch_products', 'quantity', 'stock');
        console.log('DATABASE: Renamed branch_products.quantity → stock.');
      }

      // Add new columns
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
    } else if (hasBranchProducts) {
      // Table already migrated — just ensure columns exist
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
      // Ensure stock column exists (in case old quantity column persists)
      const bpCols = await queryInterface.describeTable('branch_products');
      if (bpCols.quantity && !bpCols.stock) {
        await queryInterface.renameColumn('branch_products', 'quantity', 'stock');
        console.log('DATABASE: Renamed branch_products.quantity → stock.');
      }
    }
  } catch (error) {
    console.warn(`DATABASE: Schema migration skipped or failed: ${error.message}`);
  }
};

module.exports = migrateSchema;
