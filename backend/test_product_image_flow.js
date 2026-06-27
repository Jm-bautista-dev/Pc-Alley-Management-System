const fs = require('fs');
const path = require('path');
const imageService = require('./src/services/imageService');
const { Product } = require('./src/models');
const sequelize = require('./src/db');

async function testFlow() {
  console.log('--- STARTING VERIFICATION FLOW ---');
  
  // 1. Verify Database Schema
  try {
    await sequelize.authenticate();
    const [columns] = await sequelize.query("SHOW COLUMNS FROM products LIKE 'product_image'");
    if (columns.length > 0) {
      console.log('✅ DATABASE: product_image column is verified.');
    } else {
      throw new Error("product_image column is missing in products table.");
    }
  } catch (err) {
    console.error('❌ DATABASE VERIFICATION FAILED:', err.message);
    process.exit(1);
  }

  // 2. Load test image buffer
  const logoPath = path.join(__dirname, '../frontend/public/images/logo.png');
  if (!fs.existsSync(logoPath)) {
    console.error(`❌ TEST FILE MISSING: Expected file at ${logoPath}`);
    process.exit(1);
  }
  const imageBuffer = fs.readFileSync(logoPath);
  console.log(`✅ TEST FILE: Loaded logo.png (${(imageBuffer.length / 1024).toFixed(2)} KB)`);

  // 3. Test imageService processProductImage
  let relativePath = null;
  try {
    relativePath = await imageService.processProductImage(imageBuffer);
    console.log(`✅ IMAGE SERVICE: Image processed successfully. Base relative path: ${relativePath}`);
    
    // Verify files on disk
    const basename = path.basename(relativePath, '.webp');
    const uploadsDir = path.join(__dirname, 'uploads/products');
    const originalFile = path.join(uploadsDir, `${basename}_original.webp`);
    const mediumFile = path.join(uploadsDir, `${basename}_medium.webp`);
    const thumbnailFile = path.join(uploadsDir, `${basename}_thumbnail.webp`);

    if (fs.existsSync(originalFile) && fs.existsSync(mediumFile) && fs.existsSync(thumbnailFile)) {
      console.log('✅ IMAGE SERVICE: Verification successful. All three sizes exist on disk:');
      console.log(`   - Original: ${(fs.statSync(originalFile).size / 1024).toFixed(2)} KB`);
      console.log(`   - Medium: ${(fs.statSync(mediumFile).size / 1024).toFixed(2)} KB`);
      console.log(`   - Thumbnail: ${(fs.statSync(thumbnailFile).size / 1024).toFixed(2)} KB`);
    } else {
      throw new Error("One or more processed image files are missing on disk.");
    }
  } catch (err) {
    console.error('❌ IMAGE SERVICE PROCESS FAILED:', err.message);
    process.exit(1);
  }

  // 4. Test imageService deleteProductImageFiles (cleanup test)
  try {
    imageService.deleteProductImageFiles(relativePath);
    const basename = path.basename(relativePath, '.webp');
    const uploadsDir = path.join(__dirname, 'uploads/products');
    const originalFile = path.join(uploadsDir, `${basename}_original.webp`);
    const mediumFile = path.join(uploadsDir, `${basename}_medium.webp`);
    const thumbnailFile = path.join(uploadsDir, `${basename}_thumbnail.webp`);

    if (!fs.existsSync(originalFile) && !fs.existsSync(mediumFile) && !fs.existsSync(thumbnailFile)) {
      console.log('✅ IMAGE SERVICE: Cleanup verified. Files deleted successfully from disk.');
    } else {
      throw new Error("One or more image files were not deleted from disk.");
    }
  } catch (err) {
    console.error('❌ IMAGE SERVICE CLEANUP FAILED:', err.message);
    process.exit(1);
  }

  console.log('--- ALL PROGRAMMATIC VERIFICATION PASSED ---');
  process.exit(0);
}

testFlow();
