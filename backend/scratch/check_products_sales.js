require('dotenv').config({ path: './backend/.env' });
const { Product, OrderItem } = require('../src/models');
const sequelize = require('../src/db');

async function checkProducts() {
  try {
    await sequelize.authenticate();
    const products = await Product.findAll();
    console.log('--- Current Products and Sales ---');
    for (const p of products) {
      const salesCount = await OrderItem.count({ where: { product_id: p.id } });
      console.log(`[ID: ${p.id}] ${p.name} - SKU: ${p.sku} - Sales: ${salesCount}`);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkProducts();
