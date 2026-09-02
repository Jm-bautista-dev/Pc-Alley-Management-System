const { Product, Category } = require('../models');
const { Op } = require('sequelize');

/**
 * Generates a unique sequential SKU.
 * Format: [PREFIX]-[6 digit sequence] (e.g. CPU-000001)
 *
 * @param {number|string} categoryId - The ID of the category
 * @param {boolean} isBundle - Whether the product is a bundle
 * @returns {Promise<string>} The generated SKU
 */
async function generateUniqueSku(categoryId, isBundle = false) {
  let prefix = 'PRD';
  if (isBundle) {
    prefix = 'BND';
  }

  if (categoryId) {
    try {
      const category = await Category.findByPk(categoryId);
      if (category && category.name) {
        // Alphanumeric uppercase, max 4 chars
        const cleanName = category.name.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
        if (cleanName) {
          prefix = cleanName;
        }
      }
    } catch (err) {
      console.error('[SKU GENERATOR] Failed to fetch category:', err);
    }
  }

  // Find products matching the prefix pattern to compute the highest number
  const products = await Product.findAll({
    where: {
      sku: {
        [Op.like]: `${prefix}-%`
      }
    },
    order: [['sku', 'DESC']],
    attributes: ['sku']
  });

  let maxNum = 0;
  for (const p of products) {
    const parts = p.sku.split('-');
    const numPart = parts[parts.length - 1];
    if (/^\d+$/.test(numPart)) {
      maxNum = parseInt(numPart, 10);
      break; // Found the highest one due to DESC ordering
    }
  }

  const nextNum = maxNum + 1;
  const sku = `${prefix}-${String(nextNum).padStart(6, '0')}`;
  return sku;
}

module.exports = { generateUniqueSku };
