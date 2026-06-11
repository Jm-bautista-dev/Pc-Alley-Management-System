const { Product, Branch, Inventory } = require('./src/models');
const sequelize = require('./src/db');

const syncInventory = async () => {
  try {
    await sequelize.sync();
    
    const products = await Product.findAll();
    const branches = await Branch.findAll();

    console.log(`Syncing ${products.length} products with ${branches.length} branches...`);

    let count = 0;
    for (const b of branches) {
      for (const p of products) {
        const [inv, created] = await Inventory.findOrCreate({
          where: { product_id: p.id, branch_id: b.id },
          defaults: { quantity: Math.floor(Math.random() * 50) + 5 } // Random seed stock
        });
        if (created) count++;
      }
    }

    console.log(`✅ DATABASE: Synchronized ${count} new inventory nodes.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ SYNC ERROR:', error);
    process.exit(1);
  }
};

syncInventory();
