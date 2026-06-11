const sequelize = require('../src/db');

async function checkSchema3() {
  try {
    const [results, metadata] = await sequelize.query('DESCRIBE Suppliers');
    console.log(results);
    
    // Add missing columns if any
    const fields = results.map(col => col.Field);
    const alterQueries = [];
    
    if (!fields.includes('contact_person')) alterQueries.push('ADD COLUMN contact_person VARCHAR(255) DEFAULT NULL');
    if (!fields.includes('phone')) alterQueries.push('ADD COLUMN phone VARCHAR(255) DEFAULT NULL');
    if (!fields.includes('email')) alterQueries.push('ADD COLUMN email VARCHAR(255) DEFAULT NULL');
    if (!fields.includes('address')) alterQueries.push('ADD COLUMN address TEXT DEFAULT NULL');
    
    if (alterQueries.length > 0) {
      const q = `ALTER TABLE Suppliers ${alterQueries.join(', ')}`;
      console.log('Running: ', q);
      await sequelize.query(q);
      console.log('Added missing supplier columns.');
    } else {
      console.log('Suppliers is up to date.');
    }
    
    process.exit(0);
  } catch (err) {
    if (err.parent && err.parent.code === 'ER_NO_SUCH_TABLE') {
      console.log('Suppliers table does not exist. It will be created by sequelize.sync() if used, or we need to add it.');
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

checkSchema3();
