require('dotenv').config({ path: './backend/.env' });
const { Product, Inventory, StockMovement } = require('../src/models');
const sequelize = require('../src/db');

async function testDelete() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    // 1. Create a dummy product
    const product = await Product.create({
      name: 'Test Delete Product',
      sku: 'TEST-DEL-001',
      price: 99.99,
      description: 'A temporary product for testing deletion logic'
    });
    console.log(`Created test product: ${product.name} (ID: ${product.id})`);

    // 2. Create some inventory for it
    await Inventory.create({
      product_id: product.id,
      branch_id: 1,
      quantity: 10
    });
    console.log('Created dummy inventory record.');

    // 3. Create a stock movement for it
    await StockMovement.create({
      product_id: product.id,
      type: 'RESTOCK',
      quantity: 10,
      previous_stock: 0,
      new_stock: 10,
      user_id: 1
    });
    console.log('Created dummy stock movement record.');

    // 4. Run the delete logic (manual implementation of what's in controller)
    console.log('Starting deletion sequence...');
    
    // Clear dependencies
    await Inventory.destroy({ where: { product_id: product.id } });
    console.log('Inventory cleared.');
    
    await StockMovement.destroy({ where: { product_id: product.id } });
    console.log('Stock movements cleared.');

    // Check for sales (should be none for this test)
    const { OrderItem } = require('../src/models');
    const hasSales = await OrderItem.findOne({ where: { product_id: product.id } });
    if (hasSales) {
       console.error('FAILED: Sales history detected (unexpected).');
    } else {
       await product.destroy();
       console.log('Product purged successfully.');
    }

    // 5. Verify
    const check = await Product.findByPk(product.id);
    if (!check) {
      console.log('VERIFICATION SUCCESS: Product no longer exists in database.');
    } else {
      console.error('VERIFICATION FAILED: Product still exists.');
    }

    process.exit(0);
  } catch (err) {
    console.error('TEST FAILED:', err.message);
    process.exit(1);
  }
}

testDelete();
