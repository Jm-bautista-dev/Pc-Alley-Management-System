process.env.DB_NAME = 'pc_alley_db';
process.env.DB_USER = 'root';
process.env.DB_PASS = '';
process.env.DB_HOST = 'localhost';

const { Product } = require('../src/models');

async function check() {
  try {
    const products = await Product.findAll({ limit: 10 });
    console.log('--- PRODUCTS DATA ---');
    products.forEach(p => {
      console.log(`ID: ${p.id} | Name: ${p.name} | Price: ${p.price} | Last: ${p.last_purchase_price}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
