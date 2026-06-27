const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const addColumnIfMissing = async (queryInterface, tableName, columnName, definition) => {
  const table = await queryInterface.describeTable(tableName);

  if (table[columnName]) {
    return;
  }

  await queryInterface.addColumn(tableName, columnName, definition);
  console.log(`DATABASE: Added ${tableName}.${columnName} column.`);
};

const migrateSchema = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    await addColumnIfMissing(queryInterface, 'Users', 'first_name', {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Users', 'last_name', {
      type: DataTypes.STRING,
      allowNull: true
    });

    const userTable = await queryInterface.describeTable('Users');
    if (userTable.full_name) {
      console.log('DATABASE: Found full_name column in Users. Starting backfill...');
      const users = await sequelize.query("SELECT id, full_name, first_name, last_name FROM Users", { type: sequelize.QueryTypes.SELECT });
      for (const u of users) {
        if (!u.first_name || !u.last_name) {
          let first = '';
          let last = '';
          if (u.full_name) {
            const parts = u.full_name.trim().split(/\s+/);
            if (parts.length > 1) {
              first = parts[0];
              last = parts.slice(1).join(' ');
            } else {
              first = parts[0] || 'User';
              last = 'System';
            }
          } else {
            first = 'User';
            last = 'System';
          }
          await sequelize.query("UPDATE Users SET first_name = ?, last_name = ? WHERE id = ?", {
            replacements: [first, last, u.id]
          });
        }
      }
      // Make them non-nullable now that we backfilled them
      await queryInterface.changeColumn('Users', 'first_name', {
        type: DataTypes.STRING,
        allowNull: false
      });
      await queryInterface.changeColumn('Users', 'last_name', {
        type: DataTypes.STRING,
        allowNull: false
      });
      // Remove full_name column
      await queryInterface.removeColumn('Users', 'full_name');
      console.log('DATABASE: Successfully backfilled first_name/last_name and dropped Users.full_name.');
    } else {
      await queryInterface.changeColumn('Users', 'first_name', {
        type: DataTypes.STRING,
        allowNull: false
      });
      await queryInterface.changeColumn('Users', 'last_name', {
        type: DataTypes.STRING,
        allowNull: false
      });
    }
    await addColumnIfMissing(queryInterface, 'Products', 'product_image', {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Products', 'max_request_quantity', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Products', 'min_request_quantity', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Products', 'available_quantity', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100
    });
    await addColumnIfMissing(queryInterface, 'Products', 'reserved_quantity', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await addColumnIfMissing(queryInterface, 'Products', 'branch_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Branches', key: 'id' }
    });
    await addColumnIfMissing(queryInterface, 'Notifications', 'branch_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Branches', key: 'id' }
    });
    await addColumnIfMissing(queryInterface, 'RestockRequests', 'processed_at', {
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
    await addColumnIfMissing(queryInterface, 'Products', 'deleted_at', {
      type: DataTypes.DATE,
      allowNull: true
    });
  } catch (error) {
    console.warn(`DATABASE: Schema migration skipped or failed: ${error.message}`);
  }
};

module.exports = migrateSchema;
