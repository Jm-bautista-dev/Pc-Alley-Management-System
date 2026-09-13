const sequelize = require('./src/db');
const { Bundle, BundleItem, BundleBranch, Product, Branch, User } = require('./src/models');
const bundleController = require('./src/controllers/bundleController');

// Mock Express req & res
const mockReq = (params = {}, body = {}, query = {}, user = {}) => ({
  params,
  body,
  query,
  user
});

const mockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.data = data;
    return res;
  };
  res.send = (data) => {
    res.data = data;
    return res;
  };
  return res;
};

async function runTests() {
  console.log('=== RUNNING BUNDLES WORKFLOW AUTOMATED TEST ===\n');

  try {
    await sequelize.authenticate();
    console.log('1. Database connection authenticated.');

    // Ensure tables exist
    await Bundle.sync();
    await BundleItem.sync();
    await BundleBranch.sync();
    console.log('2. Bundle tables verified/synced.');

    // Find or create test branches
    let branchA = await Branch.findOne({ where: { name: 'Test Branch A' } });
    if (!branchA) {
      branchA = await Branch.create({ name: 'Test Branch A', location: 'Location A' });
    }
    let branchB = await Branch.findOne({ where: { name: 'Test Branch B' } });
    if (!branchB) {
      branchB = await Branch.create({ name: 'Test Branch B', location: 'Location B' });
    }
    let branchC = await Branch.findOne({ where: { name: 'Test Branch C' } });
    if (!branchC) {
      branchC = await Branch.create({ name: 'Test Branch C', location: 'Location C' });
    }
    console.log(`3. Test branches ready: A (${branchA.id}), B (${branchB.id}), C (${branchC.id})`);

    // Find or create test products
    let prod1 = await Product.findOne({ where: { name: 'Test Mechanical Keyboard' } });
    if (!prod1) {
      prod1 = await Product.create({
        name: 'Test Mechanical Keyboard',
        sku: 'TEST-KB-' + Date.now(),
        price: 2500.00
      });
    }
    let prod2 = await Product.findOne({ where: { name: 'Test Gaming Mouse' } });
    if (!prod2) {
      prod2 = await Product.create({
        name: 'Test Gaming Mouse',
        sku: 'TEST-MS-' + Date.now(),
        price: 1500.00
      });
    }
    console.log(`4. Test products ready: ${prod1.name} (₱${prod1.price}), ${prod2.name} (₱${prod2.price})`);

    // 5. TEST: Create Bundle as Super Admin
    console.log('\n--- Test 5: Create Bundle as Super Admin ---');
    const superAdminUser = { id: 1, username: 'superadmin', role: 'super_admin' };
    const createReq = mockReq(
      {},
      {
        name: 'Gamer Pro Starter Pack',
        description: 'Complete peripheral package',
        price: 3500.00,
        items: [
          { product_id: prod1.id, quantity: 1 },
          { product_id: prod2.id, quantity: 2 }
        ],
        branch_ids: [branchA.id, branchB.id] // Available at Branch A and B, but NOT C
      },
      {},
      superAdminUser
    );
    const createRes = mockRes();
    await bundleController.createBundle(createReq, createRes);

    if (createRes.statusCode !== 201) {
      throw new Error(`Failed to create bundle: ${JSON.stringify(createRes.data)}`);
    }
    const createdBundle = createRes.data;
    console.log(`✓ Bundle created successfully! ID: ${createdBundle.id}, Name: "${createdBundle.name}", Price: ₱${createdBundle.price}`);
    console.log(`  Items count: ${createdBundle.items.length}, Branches count: ${createdBundle.branches.length}`);

    // 6. TEST: Super Admin views all bundles
    console.log('\n--- Test 6: Super Admin views all bundles ---');
    const getAllReq = mockReq({}, {}, {}, superAdminUser);
    const getAllRes = mockRes();
    await bundleController.getBundles(getAllReq, getAllRes);
    const superAdminBundles = getAllRes.data;
    const foundInAll = superAdminBundles.some(b => b.id === createdBundle.id);
    if (!foundInAll) throw new Error('Created bundle not found in Super Admin full list!');
    console.log(`✓ Super Admin retrieved all bundles (${superAdminBundles.length} total). Target bundle found.`);

    // 7. TEST: Branch Admin for Branch A sees the bundle
    console.log('\n--- Test 7: Branch Admin for Branch A sees the bundle ---');
    const branchAdminAReq = mockReq({}, {}, {}, { id: 2, username: 'adminA', role: 'branch_admin', branch_id: branchA.id });
    const branchAdminARes = mockRes();
    await bundleController.getBundles(branchAdminAReq, branchAdminARes);
    const branchABundles = branchAdminARes.data;
    const foundInA = branchABundles.some(b => b.id === createdBundle.id);
    if (!foundInA) throw new Error('Bundle should be visible to Branch Admin A!');
    console.log(`✓ Branch Admin A successfully retrieved bundle (total ${branchABundles.length} bundles for Branch A).`);

    // 8. TEST: Branch Admin for Branch C does NOT see the bundle
    console.log('\n--- Test 8: Branch Admin for Branch C does NOT see the bundle ---');
    const branchAdminCReq = mockReq({}, {}, {}, { id: 3, username: 'adminC', role: 'branch_admin', branch_id: branchC.id });
    const branchAdminCRes = mockRes();
    await bundleController.getBundles(branchAdminCReq, branchAdminCRes);
    const branchCBundles = branchAdminCRes.data;
    const foundInC = branchCBundles.some(b => b.id === createdBundle.id);
    if (foundInC) throw new Error('Bundle should NOT be visible to Branch Admin C!');
    console.log(`✓ Branch Admin C correctly does NOT see bundle assigned only to A and B.`);

    // 9. TEST: Branch Admin C direct getBundleById is rejected with 403
    console.log('\n--- Test 9: Branch Admin C direct access to unassigned bundle is rejected (403) ---');
    const getByIdCReq = mockReq({ id: createdBundle.id }, {}, {}, { id: 3, username: 'adminC', role: 'branch_admin', branch_id: branchC.id });
    const getByIdCRes = mockRes();
    await bundleController.getBundleById(getByIdCReq, getByIdCRes);
    if (getByIdCRes.statusCode !== 403) {
      throw new Error(`Expected 403 Forbidden for Branch Admin C, got: ${getByIdCRes.statusCode}`);
    }
    console.log(`✓ Access correctly denied with 403 Forbidden: "${getByIdCRes.data.message}"`);

    // 10. TEST: Super Admin updates bundle (change price and items)
    console.log('\n--- Test 10: Super Admin updates bundle ---');
    const updateReq = mockReq(
      { id: createdBundle.id },
      {
        name: 'Gamer Pro Starter Pack - Updated',
        price: 3299.00,
        items: [
          { product_id: prod1.id, quantity: 2 }
        ],
        branch_ids: [branchA.id, branchB.id, branchC.id] // Now available in all 3
      },
      {},
      superAdminUser
    );
    const updateRes = mockRes();
    await bundleController.updateBundle(updateReq, updateRes);
    if (updateRes.statusCode !== 200) {
      throw new Error(`Update failed: ${JSON.stringify(updateRes.data)}`);
    }
    console.log(`✓ Bundle updated successfully. New Name: "${updateRes.data.name}", Price: ₱${updateRes.data.price}`);
    console.log(`  Updated Branches: ${updateRes.data.branches.map(b => b.name).join(', ')}`);

    // 11. TEST: Super Admin deletes bundle
    console.log('\n--- Test 11: Super Admin deletes bundle ---');
    const deleteReq = mockReq({ id: createdBundle.id }, {}, {}, superAdminUser);
    const deleteRes = mockRes();
    await bundleController.deleteBundle(deleteReq, deleteRes);
    if (deleteRes.statusCode !== 200) {
      throw new Error(`Delete failed: ${JSON.stringify(deleteRes.data)}`);
    }
    const verifyDeleted = await Bundle.findByPk(createdBundle.id);
    const remainingItems = await BundleItem.findAll({ where: { bundle_id: createdBundle.id } });
    const remainingBranches = await BundleBranch.findAll({ where: { bundle_id: createdBundle.id } });
    if (verifyDeleted || remainingItems.length > 0 || remainingBranches.length > 0) {
      throw new Error('Bundle cascade delete failed!');
    }
    console.log('✓ Bundle and associated junction items/branches cleanly removed.');

    // Clean up test products and branches
    await prod1.destroy();
    await prod2.destroy();
    await branchA.destroy();
    await branchB.destroy();
    await branchC.destroy();
    console.log('\n12. Test fixtures cleaned up successfully.');

    console.log('\n========================================');
    console.log('ALL BUNDLES TESTS PASSED SUCCESSFULLY! ✓');
    console.log('========================================');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    process.exit(1);
  }
}

runTests();
