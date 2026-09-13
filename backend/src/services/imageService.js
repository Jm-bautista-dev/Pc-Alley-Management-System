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
 * Processes the uploaded image buffer, compresses it, and generates 4 sizes/files:
 * - Base image (${prefix}.webp) for standard/default display (800x800, quality 80)
 * - Original (${prefix}_original.webp) for high-resolution inspection (1200x1200, quality 85)
 * - Medium (${prefix}_medium.webp) for product cards and modals (600x600, quality 80)
 * - Thumbnail (${prefix}_thumbnail.webp) for tables and fast previews (150x150, quality 75)
 * All output files will be in WebP format.
 * 
 * @param {Buffer} fileBuffer 
 * @returns {Promise<string>} Base relative path of the processed image (e.g., '/uploads/products/product_x_y.webp')
 */
async function processProductImage(fileBuffer) {
  const prefix = generateFilenamePrefix();
  
  const baseFilename = `${prefix}.webp`;
  const originalFilename = `${prefix}_original.webp`;
  const mediumFilename = `${prefix}_medium.webp`;
  const thumbnailFilename = `${prefix}_thumbnail.webp`;

  const basePath = path.join(UPLOADS_DIR, baseFilename);
  const originalPath = path.join(UPLOADS_DIR, originalFilename);
  const mediumPath = path.join(UPLOADS_DIR, mediumFilename);
  const thumbnailPath = path.join(UPLOADS_DIR, thumbnailFilename);

  // 1. Process and save Base display image (Max width/height 800px, quality 80)
  await sharp(fileBuffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .toFormat('webp', { quality: 80 })
    .toFile(basePath);

  // 2. Process and save Original high-res image (Max width/height 1200px, quality 85)
  await sharp(fileBuffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .toFormat('webp', { quality: 85 })
    .toFile(originalPath);

  // 3. Process and save Medium image (Max width/height 600px, quality 80)
  await sharp(fileBuffer)
    .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
    .toFormat('webp', { quality: 80 })
    .toFile(mediumPath);

  // 4. Process and save Thumbnail image (Max width/height 150px, quality 75)
  await sharp(fileBuffer)
    .resize(150, 150, { fit: 'inside', withoutEnlargement: true })
    .toFormat('webp', { quality: 75 })
    .toFile(thumbnailPath);

  // Return base relative URL path (e.g., '/uploads/products/product_x_y.webp') to store in the DB
  return `/uploads/products/${baseFilename}`;
}

/**
 * Deletes all sizes of a product image file from the disk to prevent orphaned files.
 * 
 * @param {string} baseRelativePath Base relative path or any variant path (e.g., '/uploads/products/product_x_y.webp')
 */
function deleteProductImageFiles(baseRelativePath) {
  if (!baseRelativePath) return;

  // Extract base prefix name from relative path, stripping any variant suffixes
  let basename = path.basename(baseRelativePath);
  basename = basename.replace(/(_original|_medium|_thumbnail)?\.webp$/i, '');
  
  // Resolve paths for base file and all three resolutions
  const filenames = [
    `${basename}.webp`,
    `${basename}_original.webp`,
    `${basename}_medium.webp`,
    `${basename}_thumbnail.webp`
  ];
  
  filenames.forEach(filename => {
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

const BRANDS_DIR = path.join(__dirname, '../../uploads/brands');
if (!fs.existsSync(BRANDS_DIR)) {
  fs.mkdirSync(BRANDS_DIR, { recursive: true });
}

async function processBrandLogo(fileBuffer) {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9).toString(36).substring(0, 4);
  const prefix = `brand_${timestamp}_${random}`;
  
  const filename = `${prefix}.webp`;
  const fullPath = path.join(BRANDS_DIR, filename);

  await sharp(fileBuffer)
    .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
    .toFormat('webp', { quality: 85 })
    .toFile(fullPath);

  return `/uploads/brands/${filename}`;
}

function deleteBrandLogo(relativeUrl) {
  if (!relativeUrl) return;
  const filename = path.basename(relativeUrl);
  const fullPath = path.join(BRANDS_DIR, filename);
  
  const relativePathFromUploads = path.relative(BRANDS_DIR, fullPath);
  if (relativePathFromUploads.startsWith('..') || path.isAbsolute(relativePathFromUploads)) {
    console.warn(`[SECURITY WARN] Prevented directory traversal attempt for deletion: ${fullPath}`);
    return;
  }
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`[FILE CLEANUP] Successfully deleted brand logo: ${filename}`);
    }
  } catch (err) {
    console.error(`Failed to delete logo: ${err.message}`);
  }
}

module.exports = {
  processProductImage,
  deleteProductImageFiles,
  processBrandLogo,
  deleteBrandLogo
};
