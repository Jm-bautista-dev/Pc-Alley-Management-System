const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const jwt = require('jsonwebtoken');
const http = require('http');

const app = require('./src/server');
const { Product } = require('./src/models');

const UPLOADS_DIR = path.join(__dirname, 'uploads/products');
const TEST_PORT = 5088;

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING END-TO-END PRODUCT IMAGE LIFECYCLE TEST');
  console.log('====================================================');

  // Start test HTTP server on port 5088
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`Test server running on port ${TEST_PORT}`);

  const BASE_URL = `http://localhost:${TEST_PORT}`;

  // 1. Create a super_admin JWT token for authentication
  const token = jwt.sign(
    { id: 1, username: 'superadmin', role: 'super_admin' },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '1h' }
  );

  // 2. Generate valid dummy test image buffers
  const testImageBuffer = await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 }
    }
  }).png().toBuffer();

  const testImageBuffer2 = await sharp({
    create: {
      width: 300,
      height: 300,
      channels: 4,
      background: { r: 0, g: 255, b: 0, alpha: 1 }
    }
  }).png().toBuffer();

  let createdProductId = null;
  let createdImagePath = null;
  let updatedImagePath = null;

  try {
    // ----------------------------------------------------
    // TEST 1: Existing images on disk and DB consistency
    // ----------------------------------------------------
    console.log('\n[TEST 1] Checking existing products (ID 1 & 2)...');
    const existingP1 = await Product.findByPk(1);
    if (existingP1) {
      console.log(`Product 1 image_url: ${existingP1.image_url}`);
      console.log(`Product 1 product_image: ${existingP1.product_image}`);
      if (existingP1.image_url !== existingP1.product_image) {
        throw new Error('Product 1 image_url and product_image are not synchronized!');
      }
      const p1Disk = path.join(__dirname, existingP1.image_url);
      if (!fs.existsSync(p1Disk)) {
        throw new Error(`Base image file does not exist on disk for Product 1: ${p1Disk}`);
      }
      console.log('✓ Product 1 base image exists on disk and DB columns are synchronized.');
    }

    // ----------------------------------------------------
    // TEST 2: Upload new product with photo
    // ----------------------------------------------------
    console.log('\n[TEST 2] Creating new product with uploaded image...');
    const testSku = `TEST-IMG-${Date.now()}`;
    const form = new FormData();
    form.append('name', 'E2E Image Test Product');
    form.append('sku', testSku);
    form.append('price', '1299.99');
    form.append('description', 'Test product for image lifecycle');
    form.append('image', new Blob([testImageBuffer], { type: 'image/png' }), 'test_product.png');

    const resCreate = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    });

    const createJson = await resCreate.json();
    if (!resCreate.ok) {
      console.error('Create error:', createJson);
      throw new Error(`Failed to create product: HTTP ${resCreate.status}`);
    }

    createdProductId = createJson.id;
    createdImagePath = createJson.image_url;
    console.log(`Created product ID: ${createdProductId}`);
    console.log(`Returned image_url: ${createdImagePath}`);
    console.log(`Returned product_image: ${createJson.product_image}`);

    if (!createdImagePath || !createdImagePath.startsWith('/uploads/products/')) {
      throw new Error(`Unexpected image_url format: ${createdImagePath}`);
    }
    if (createJson.image_url !== createJson.product_image) {
      throw new Error('image_url and product_image do not match in API response!');
    }

    // ----------------------------------------------------
    // TEST 3: Verify all 4 files exist on disk
    // ----------------------------------------------------
    console.log('\n[TEST 3] Verifying generated files on disk...');
    const prefix = path.basename(createdImagePath, '.webp');
    const expectedFiles = [
      `${prefix}.webp`,
      `${prefix}_original.webp`,
      `${prefix}_medium.webp`,
      `${prefix}_thumbnail.webp`
    ];

    for (const f of expectedFiles) {
      const fullPath = path.join(UPLOADS_DIR, f);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Missing expected file on disk: ${fullPath}`);
      }
      const stats = fs.statSync(fullPath);
      console.log(`✓ File ${f} exists (${stats.size} bytes)`);
    }

    // ----------------------------------------------------
    // TEST 4: Verify static file serving and smart fallback
    // ----------------------------------------------------
    console.log('\n[TEST 4] Testing HTTP static serving & fallback route...');
    
    // 4a. Base file request
    const resBase = await fetch(`${BASE_URL}${createdImagePath}`);
    if (resBase.status !== 200 || !resBase.headers.get('content-type')?.includes('webp')) {
      throw new Error(`Base image HTTP request failed: status ${resBase.status}, content-type ${resBase.headers.get('content-type')}`);
    }
    console.log(`✓ GET ${createdImagePath} -> 200 OK (${resBase.headers.get('content-type')})`);

    // 4b. Medium file request
    const mediumPath = createdImagePath.replace('.webp', '_medium.webp');
    const resMedium = await fetch(`${BASE_URL}${mediumPath}`);
    if (resMedium.status !== 200) {
      throw new Error(`Medium image HTTP request failed: status ${resMedium.status}`);
    }
    console.log(`✓ GET ${mediumPath} -> 200 OK`);

    // 4c. Non-existent variant fallback: test smart resolver
    const simulatedMissingVariant = `/uploads/products/${prefix}_nonexistent_variant.webp`;
    const resFallback = await fetch(`${BASE_URL}${simulatedMissingVariant}`);
    if (resFallback.status !== 200) {
      throw new Error(`Smart variant fallback failed: status ${resFallback.status}`);
    }
    console.log(`✓ Smart Fallback for missing variant -> 200 OK (${resFallback.headers.get('content-type')})`);

    // 4d. Completely non-existent product should 404
    const res404 = await fetch(`${BASE_URL}/uploads/products/product_999999999_fake.webp`);
    if (res404.status !== 404) {
      throw new Error(`Expected 404 for nonexistent file, got ${res404.status}`);
    }
    console.log(`✓ Non-existent product image cleanly returns 404 Not Found.`);

    // ----------------------------------------------------
    // TEST 5: Update product photo (replace image)
    // ----------------------------------------------------
    console.log('\n[TEST 5] Updating product with replacement image...');
    const updateForm = new FormData();
    updateForm.append('name', 'E2E Image Test Product Updated');
    updateForm.append('image', new Blob([testImageBuffer2], { type: 'image/png' }), 'replacement.png');

    const resUpdate = await fetch(`${BASE_URL}/api/products/${createdProductId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: updateForm
    });

    const updateJson = await resUpdate.json();
    if (!resUpdate.ok) {
      console.error('Update error:', updateJson);
      throw new Error(`Failed to update product image: HTTP ${resUpdate.status}`);
    }

    updatedImagePath = updateJson.image_url;
    console.log(`Updated image_url: ${updatedImagePath}`);
    if (updatedImagePath === createdImagePath) {
      throw new Error('Image URL did not change after replacement upload!');
    }

    // Verify OLD files were deleted
    for (const f of expectedFiles) {
      const oldPath = path.join(UPLOADS_DIR, f);
      if (fs.existsSync(oldPath)) {
        throw new Error(`Old image file was not deleted after replacement: ${oldPath}`);
      }
    }
    console.log('✓ Old image variants were successfully purged from disk.');

    // Verify NEW files exist
    const newPrefix = path.basename(updatedImagePath, '.webp');
    const newExpectedFiles = [
      `${newPrefix}.webp`,
      `${newPrefix}_original.webp`,
      `${newPrefix}_medium.webp`,
      `${newPrefix}_thumbnail.webp`
    ];
    for (const f of newExpectedFiles) {
      const newFullPath = path.join(UPLOADS_DIR, f);
      if (!fs.existsSync(newFullPath)) {
        throw new Error(`New image variant missing on disk: ${newFullPath}`);
      }
    }
    console.log('✓ New image variants exist on disk.');

    // ----------------------------------------------------
    // TEST 6: Delete product and purge images
    // ----------------------------------------------------
    console.log('\n[TEST 6] Deleting product and verifying asset purge...');
    const resDelete = await fetch(`${BASE_URL}/api/products/${createdProductId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!resDelete.ok) {
      throw new Error(`Failed to delete product: HTTP ${resDelete.status}`);
    }

    for (const f of newExpectedFiles) {
      const remainingPath = path.join(UPLOADS_DIR, f);
      if (fs.existsSync(remainingPath)) {
        throw new Error(`Image file was not cleaned up on product delete: ${remainingPath}`);
      }
    }
    console.log('✓ All image files cleaned up after product deletion.');

    console.log('\n====================================================');
    console.log('🎉 ALL PRODUCT IMAGE LIFECYCLE TESTS PASSED PERFECTLY!');
    console.log('====================================================\n');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    if (createdProductId) {
      try {
        await Product.destroy({ where: { id: createdProductId }, force: true });
      } catch (cleanupErr) {}
    }
    server.close();
    process.exit(1);
  }
}

// Allow time for initial db setup
setTimeout(runTests, 1500);
