const sequelize = require('./src/db');

sequelize.query("ALTER TABLE orders ADD COLUMN proof_of_payment_url VARCHAR(255)")
  .then(r => console.log('Column added successfully!'))
  .catch(console.error)
  .finally(()=>process.exit())










