const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Product, Inventory } = require('../src/models');
const sequelize = require('../src/db');

async function fixStock() {
  try {
    const productName = "NVIDIA RTX 4080 Super";
    const product = await Product.findOne({ where: { name: productName } });

    if (!product) {
      console.log(`Product "${productName}" not found.`);
      return;
    }

    console.log(`Found product: ${product.name} (ID: ${product.id})`);

    const result = await Inventory.update(
      { quantity: 50 },
      { where: { product_id: product.id } }
    );

    console.log(`Updated ${result[0]} inventory records for ${productName} to 50.`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error fixing stock:", error);
    process.exit(1);
  }
}

fixStock();
