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
  } catch (error) {
    console.warn(`DATABASE: Schema migration skipped or failed: ${error.message}`);
  }
};

module.exports = migrateSchema;
