const { Product } = require('../src/models');
const sequelize = require('../src/db');

async function check() {
  try {
    const products = await Product.findAll({ limit: 5 });
    console.log(JSON.stringify(products, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
