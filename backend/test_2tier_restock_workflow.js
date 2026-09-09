const http = require('http');
const app = require('./src/server');
const sequelize = require('./src/db');
const { Product, BranchProduct, ProductRequest, AuditLog, Notification, StockMovement, Branch, User } = require('./src/models');
const jwt = require('jsonwebtoken');

const TEST_PORT = 5098;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverInstance;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function api(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING 2-TIER RESTOCK & BRANCH-GROUPED BATCH APPROVAL TESTS');
  console.log('================================================================');

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`Test server running on ${BASE_URL}`);
      resolve();
    });
  });

  try {
    // Generate mock tokens with secret or login
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const saUser = await User.findOne({ where: { role: 'super_admin' } }) || { id: 1, role: 'super_admin', username: 'superadmin' };
    const branch = await Branch.findOne() || await Branch.create({ name: 'Sta Cruz Branch', location: 'Manila' });
    const baUser = await User.findOne({ where: { role: 'branch_admin', branch_id: branch.id } }) || await User.create({ username: `test_ba_${Date.now()}`, role: 'branch_admin', branch_id: branch.id, password: 'hash' });
    const staffUser = await User.findOne({ where: { role: 'employee', branch_id: branch.id } }) || await User.create({ username: `test_staff_${Date.now()}`, role: 'employee', branch_id: branch.id, password: 'hash' });

    const saToken = jwt.sign({ id: saUser.id, role: 'super_admin', branch_id: saUser.branch_id }, secret);
    const baToken = jwt.sign({ id: baUser.id, role: 'branch_admin', branch_id: branch.id }, secret);
    const staffToken = jwt.sign({ id: staffUser.id, role: 'employee', branch_id: branch.id }, secret);

    console.log('\n--- 1. Testing Staff Request Submission (Tier 1: Status PENDING_ADMIN) ---');
    const testProd = await Product.create({
      name: `2-Tier Test GPU ${Date.now()}`,
      sku: `2TIER-GPU-${Date.now()}`,
      price: 15000,
      available_quantity: 50,
      reserved_quantity: 0
    });

    const createRes = await api('/api/product-requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        items: [{ product_id: testProd.id, quantity_requested: 5 }],
        priority: 'urgent',
        notes: 'Tournament restock needed'
      })
    });

    assert(createRes.status === 201, 'Staff creates stock request successfully (201 Created)');
    const reqItem = createRes.data.requests[0];
    assert(reqItem.status === 'PENDING_ADMIN', `Initial status is strictly 'PENDING_ADMIN' (Got: ${reqItem.status})`);

    console.log('\n--- 2. Testing Branch Summary Aggregation ---');
    const summaryRes = await api('/api/product-requests/branch-summary', {
      headers: { Authorization: `Bearer ${saToken}` }
    });
    assert(summaryRes.status === 200, 'Super Admin can fetch branch summary (200 OK)');
    assert(Array.isArray(summaryRes.data), 'Summary response is an array of branch metrics');
    const branchStat = summaryRes.data.find(b => b.branch_id === branch.id);
    assert(branchStat !== undefined, 'Target branch is present in summary');
    assert(branchStat.pending_admin_count >= 1, 'Pending Admin count accurately reflects staff submissions');

    console.log('\n--- 3. Testing Branch Admin Endorsement (Tier 1 -> Tier 2: PENDING_SUPERADMIN) ---');
    const branchApproveRes = await api(`/api/product-requests/${reqItem.id}/branch-approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${baToken}` },
      body: JSON.stringify({ approval_notes: 'Endorsed by Branch Manager' })
    });
    assert(branchApproveRes.status === 200, 'Branch Admin approves and endorses request (200 OK)');
    assert(branchApproveRes.data.request.status === 'PENDING_SUPERADMIN', 'Status transitioned to PENDING_SUPERADMIN');
    assert(branchApproveRes.data.request.branch_approved_by === baUser.id, 'Branch approver user ID recorded');

    console.log('\n--- 4. Testing Super Admin Batch Approve (Select All / Multiple IDs) ---');
    const batchApproveRes = await api('/api/product-requests/batch-approve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${saToken}` },
      body: JSON.stringify({
        ids: [reqItem.id],
        approval_notes: 'Batch authorized by Super Admin HQ'
      })
    });
    assert(batchApproveRes.status === 200, 'Super Admin batch approve returns 200 OK');
    assert(batchApproveRes.data.results.approved.includes(reqItem.id), 'Request ID was successfully approved in batch');

    // Verify stock reservation in warehouse
    await testProd.reload();
    assert(testProd.available_quantity === 45, 'Warehouse available quantity reduced by 5 (50 -> 45)');
    assert(testProd.reserved_quantity === 5, 'Warehouse reserved quantity increased by 5 (0 -> 5)');

    console.log('\n--- 5. Testing Super Admin Fulfillment ---');
    const fulfillRes = await api(`/api/product-requests/${reqItem.id}/fulfill`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${saToken}` }
    });
    assert(fulfillRes.status === 200, 'Super Admin fulfills request (200 OK)');
    assert(fulfillRes.data.request.status === 'FULFILLED', 'Status transitioned to FULFILLED');

    // Verify destination branch inventory updated
    const branchInv = await BranchProduct.findOne({
      where: { product_id: testProd.id, branch_id: branch.id }
    });
    assert(branchInv && branchInv.stock >= 5, `Branch inventory updated with fulfilled stock (${branchInv.stock})`);

    console.log('\n================================================================');
    console.log('🎉 ALL 2-TIER RESTOCK & BATCH APPROVAL TESTS PASSED PERFECTLY!');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (serverInstance) serverInstance.close();
    process.exit(process.exitCode || 0);
  }
}

runTests();
