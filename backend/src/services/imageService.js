const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/products');

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Generates a safe, unique filename prefix.
 */
function generateFilenamePrefix() {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9).toString(36).substring(0, 4);
  return `product_${timestamp}_${random}`;
}

/**
 * Processes the uploaded image buffer, compresses it, and generates 3 sizes (Original, Medium, Thumbnail).
 * All output files will be in WebP format.
 * 
 * @param {Buffer} fileBuffer 
 * @returns {Promise<string>} Base relative path of the processed image (e.g., '/uploads/products/product_x_y.webp')
 */
async function processProductImage(fileBuffer) {
  const prefix = generateFilenamePrefix();
  
  const originalFilename = `${prefix}_original.webp`;
  const mediumFilename = `${prefix}_medium.webp`;
  const thumbnailFilename = `${prefix}_thumbnail.webp`;

  const originalPath = path.join(UPLOADS_DIR, originalFilename);
  const mediumPath = path.join(UPLOADS_DIR, mediumFilename);
  const thumbnailPath = path.join(UPLOADS_DIR, thumbnailFilename);

  // 1. Process and save Original image (Max width/height 1200px, quality 80)
  await sharp(fileBuffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .toFormat('webp', { quality: 80 })
    .toFile(originalPath);

  // 2. Process and save Medium image (Max width/height 600px, quality 75)
  await sharp(fileBuffer)
    .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
    .toFormat('webp', { quality: 75 })
    .toFile(mediumPath);

  // 3. Process and save Thumbnail image (Max width/height 150px, quality 70)
  await sharp(fileBuffer)
    .resize(150, 150, { fit: 'inside', withoutEnlargement: true })
    .toFormat('webp', { quality: 70 })
    .toFile(thumbnailPath);

  // Return base relative URL path (without suffix) to store in the DB
  return `/uploads/products/${prefix}.webp`;
}

/**
 * Deletes all sizes of a product image file from the disk to prevent orphaned files.
 * 
 * @param {string} baseRelativePath Base relative path (e.g., '/uploads/products/product_x_y.webp')
 */
function deleteProductImageFiles(baseRelativePath) {
  if (!baseRelativePath) return;

  // Extract prefix name from relative path
  const basename = path.basename(baseRelativePath, '.webp');
  
  // Resolve paths for all three resolutions
  const suffixes = ['_original.webp', '_medium.webp', '_thumbnail.webp'];
  
  suffixes.forEach(suffix => {
    const filename = `${basename}${suffix}`;
    const fullPath = path.join(UPLOADS_DIR, filename);

    // Secure path traversal protection
    const relativePathFromUploads = path.relative(UPLOADS_DIR, fullPath);
    if (relativePathFromUploads.startsWith('..') || path.isAbsolute(relativePathFromUploads)) {
      console.warn(`[SECURITY WARN] Prevented directory traversal attempt for deletion: ${fullPath}`);
      return;
    }

    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`[FILE CLEANUP] Successfully deleted file: ${filename}`);
      }
    } catch (err) {
      console.error(`[FILE CLEANUP ERROR] Failed to delete file: ${fullPath}. Error: ${err.message}`);
    }
  });
}

module.exports = {
  processProductImage,
  deleteProductImageFiles
};
