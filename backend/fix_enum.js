const sequelize = require('./src/db');
sequelize.query("ALTER TABLE notifications MODIFY COLUMN type ENUM('info','warning','success','error','restock_request') DEFAULT 'info';")
  .then(() => console.log('Enum updated'))
  .catch(e => console.error(e))
  .finally(() => process.exit());
