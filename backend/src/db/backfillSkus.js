const { Product } = require('../models');
const { Op } = require('sequelize');
const { generateUniqueSku } = require('../utils/skuGenerator');

/**
 * Migration helper to backfill products that have missing, null, or empty SKUs.
 */
async function backfillSkus() {
  try {
    console.log('[MIGRATION] Checking for products with missing SKUs...');
    const products = await Product.findAll({
      where: {
        [Op.or]: [
          { sku: { [Op.is]: null } },
          { sku: '' }
        ]
      }
    });

    if (products.length === 0) {
      console.log('[MIGRATION] All products have SKUs. No backfill needed.');
      return;
    }

    console.log(`[MIGRATION] Found ${products.length} products without SKUs. Starting backfill...`);

    for (const product of products) {
      let success = false;
      let retries = 10;
      let sku;

      while (!success && retries > 0) {
        try {
          sku = await generateUniqueSku(product.category_id, product.is_bundle);
          product.sku = sku;
          await product.save();
          success = true;
          console.log(`[MIGRATION] Assigned SKU "${sku}" to product "${product.name}" (ID: ${product.id}).`);
        } catch (error) {
          if (error.name === 'SequelizeUniqueConstraintError') {
            retries--;
            if (retries === 0) {
              console.error(`[MIGRATION] Failed to assign unique SKU to product "${product.name}" (ID: ${product.id}) after 10 attempts.`);
            }
            // Wait a small random amount of time and retry
            await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          } else {
            console.error(`[MIGRATION] Error backfilling product ID ${product.id}:`, error);
            break; // Stop retrying for this product if it's not a unique constraint error
          }
        }
      }
    }
    console.log('[MIGRATION] SKU backfill migration completed.');
  } catch (err) {
    console.error('[MIGRATION] SKU backfill failed:', err);
  }
}

module.exports = backfillSkus;
