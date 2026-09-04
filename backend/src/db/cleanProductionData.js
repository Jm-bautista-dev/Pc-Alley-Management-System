const { Customer, Product, Sale, SaleItem, BranchProduct, Inventory } = require('../models');
const { Op } = require('sequelize');

async function cleanProductionData() {
  try {
    console.log('[DATA CLEANUP] Starting production data sanitization routine...');

    // 1. Purge test customers (Atong Ang, Alice Guo, and junk placeholder patterns)
    const testCustomers = await Customer.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: '%Atong Ang%' } },
          { name: { [Op.like]: '%Alice Guo%' } },
          { name: { [Op.like]: '%ewtewt%' } },
          { name: { [Op.like]: '%23t23%' } }
        ]
      }
    });

    for (const cust of testCustomers) {
      console.log(`[DATA CLEANUP] Purging test customer: ${cust.name} (ID: ${cust.id})`);
      // Delete any sales tied to this test customer
      const sales = await Sale.findAll({ where: { customerId: cust.id } });
      for (const s of sales) {
        await SaleItem.destroy({ where: { saleId: s.id } });
        await s.destroy();
      }
      await cust.destroy();
    }

    // 2. Fix typo emails in customer records (e.g. @gamil.com -> @gmail.com)
    const typoCustomers = await Customer.findAll({
      where: {
        email: { [Op.like]: '%@gamil.com%' }
      }
    });

    for (const cust of typoCustomers) {
      const fixedEmail = cust.email.replace(/@gamil\.com/i, '@gmail.com');
      console.log(`[DATA CLEANUP] Correcting typo email for ${cust.name}: ${cust.email} -> ${fixedEmail}`);
      cust.email = fixedEmail;
      await cust.save();
    }

    // 3. Purge test/junk products (e.g. Wqdewd, jm bautista ID 15)
    const junkProducts = await Product.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: '%Wqdewd%' } },
          { sku: { [Op.like]: '%Wqdewd%' } },
          { id: 15, name: 'jm bautista' }
        ]
      }
    });

    for (const prod of junkProducts) {
      console.log(`[DATA CLEANUP] Purging junk product: ${prod.name} (ID: ${prod.id})`);
      await SaleItem.destroy({ where: { productId: prod.id } }).catch(() => {});
      await BranchProduct.destroy({ where: { product_id: prod.id } }).catch(() => {});
      await Inventory.destroy({ where: { productId: prod.id } }).catch(() => {});
      await prod.destroy();
    }

    console.log('[DATA CLEANUP] Production data sanitization completed successfully.');
  } catch (error) {
    console.error('[DATA CLEANUP] Error during production data sanitization:', error.message);
  }
}

module.exports = cleanProductionData;
