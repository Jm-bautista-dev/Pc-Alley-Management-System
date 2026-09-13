const fs = require('fs');
const path = require('path');
const { Product } = require('../models');
const { Op } = require('sequelize');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/products');

async function syncExistingImages() {
  console.log('=== Starting Image Synchronization ===');

  // 1. Sync physical files on disk
  if (fs.existsSync(UPLOADS_DIR)) {
    const files = fs.readdirSync(UPLOADS_DIR);
    let createdCount = 0;

    for (const file of files) {
      if (file.endsWith('_medium.webp')) {
        const prefix = file.replace('_medium.webp', '');
        const baseFilename = `${prefix}.webp`;
        const basePath = path.join(UPLOADS_DIR, baseFilename);
        const mediumPath = path.join(UPLOADS_DIR, file);

        if (!fs.existsSync(basePath)) {
          fs.copyFileSync(mediumPath, basePath);
          console.log(`[DISK SYNC] Created base image: ${baseFilename} from ${file}`);
          createdCount++;
        }
      }
    }
    console.log(`[DISK SYNC] Finished syncing disk files. Generated ${createdCount} base image files.`);
  } else {
    console.log(`[DISK SYNC] Uploads directory does not exist: ${UPLOADS_DIR}`);
  }

  // 2. Sync database rows
  try {
    const productsWithMismatch = await Product.findAll({
      where: {
        [Op.or]: [
          { [Op.and]: [{ image_url: { [Op.ne]: null } }, { product_image: null }] },
          { [Op.and]: [{ product_image: { [Op.ne]: null } }, { image_url: null }] }
        ]
      }
    });

    console.log(`[DB SYNC] Found ${productsWithMismatch.length} products with unsynchronized image columns.`);

    for (const prod of productsWithMismatch) {
      const activeImage = prod.image_url || prod.product_image;
      prod.image_url = activeImage;
      prod.product_image = activeImage;
      await prod.save();
      console.log(`[DB SYNC] Synchronized product #${prod.id} (${prod.name}) -> ${activeImage}`);
    }

    console.log('[DB SYNC] Database synchronization complete.');
  } catch (err) {
    console.error('[DB SYNC ERROR]', err);
  }

  console.log('=== Image Synchronization Finished ===');
}

if (require.main === module) {
  syncExistingImages().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = syncExistingImages;
