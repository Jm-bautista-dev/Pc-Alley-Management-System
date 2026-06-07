const sequelize = require('./src/db');
async function main() {
  try {
    const [databases] = await sequelize.query('SHOW DATABASES');
    console.log('Databases:', databases.map(d => Object.values(d)[0]));
    
    const [tables] = await sequelize.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('Tables:', tableNames);

    for (const table of tableNames) {
      const [count] = await sequelize.query(`SELECT COUNT(*) as count FROM \`${table}\``);
      console.log(`Table: ${table} - Rows: ${count[0].count}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
main();
