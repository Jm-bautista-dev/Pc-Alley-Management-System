const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const migrateUsers = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    // Removed obsolete full_name column check and addition

    const indexes = await queryInterface.showIndex('Users');
    const usernameUniqueIndexes = indexes.filter((index) => {
      const fields = index.fields || [];
      return index.unique && fields.length === 1 && fields[0]?.attribute === 'username';
    });

    for (const index of usernameUniqueIndexes) {
      await queryInterface.removeIndex('Users', index.name);
      console.log(`DATABASE: Removed unique username index '${index.name}'.`);
    }
  } catch (error) {
    console.warn(`DATABASE: User migration skipped or failed: ${error.message}`);
  }
};

module.exports = migrateUsers;
