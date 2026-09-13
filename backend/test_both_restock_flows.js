const http = require('http');
const app = require('./src/server');
const sequelize = require('./src/db');
const { Product, BranchProduct, ProductRequest, AuditLog, Notification, StockMovement, Branch, User } = require('./src/models');
const jwt = require('jsonwebtoken');

const TEST_PORT = 5099;
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
  console.log('🧪 VERIFYING BOTH RESTOCK FLOWS:');
  console.log('   FLOW 1: Staff -> Branch Admin Endorsement -> Super Admin Approval');
  console.log('   FLOW 2: Branch Admin -> Direct Super Admin Approval');
  console.log('================================================================');

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`Test server running on ${BASE_URL}`);
      resolve();
    });
  });

  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const saUser = await User.findOne({ where: { role: 'super_admin' } }) || { id: 1, role: 'super_admin', username: 'superadmin' };
    const branch = await Branch.findOne() || await Branch.create({ name: 'Sta Rosa Branch', location: 'Laguna' });
    const baUser = await User.findOne({ where: { role: 'branch_admin', branch_id: branch.id } }) || await User.create({ username: `test_ba_${Date.now()}`, role: 'branch_admin', branch_id: branch.id, password: 'hash' });
    const staffUser = await User.findOne({ where: { role: 'employee', branch_id: branch.id } }) || await User.create({ username: `test_staff_${Date.now()}`, role: 'employee', branch_id: branch.id, password: 'hash' });

    const saToken = jwt.sign({ id: saUser.id, role: 'super_admin', branch_id: saUser.branch_id }, secret);
    const baToken = jwt.sign({ id: baUser.id, role: 'branch_admin', branch_id: branch.id }, secret);
    const staffToken = jwt.sign({ id: staffUser.id, role: 'employee', branch_id: branch.id }, secret);

    // =========================================================================
    // FLOW 1: STAFF -> BRANCH ADMIN ENDORSEMENT -> SUPER ADMIN
    // =========================================================================
    console.log('\n--- FLOW 1: Staff creates restock request ---');
    const prod1 = await Product.create({
      name: `Flow1 Product ${Date.now()}`,
      sku: `FLOW1-${Date.now()}`,
      price: 5000,
      available_quantity: 100,
      reserved_quantity: 0
    });

    const staffReqRes = await api('/api/product-requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        items: [{ product_id: prod1.id, quantity_requested: 10 }],
        priority: 'urgent',
        notes: 'Requested by floor staff'
      })
    });

    assert(staffReqRes.status === 201, 'Staff request created (201 Created)');
    const staffReq = staffReqRes.data.requests[0];
    assert(staffReq.status === 'PENDING_ADMIN', `Staff request initial status is PENDING_ADMIN (Got: ${staffReq.status})`);
    assert(staffReq.requested_by === staffUser.id, 'Requester ID is recorded as Staff user');

    console.log('\n--- FLOW 1: Branch Admin reviews & endorses Staff request ---');
    const endorseRes = await api(`/api/product-requests/${staffReq.id}/branch-approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${baToken}` },
      body: JSON.stringify({ approval_notes: 'Endorsed by Branch Manager for weekend rush' })
    });

    assert(endorseRes.status === 200, 'Branch Admin endorsement successful (200 OK)');
    assert(endorseRes.data.request.status === 'PENDING_SUPERADMIN', `Status transitioned from PENDING_ADMIN to PENDING_SUPERADMIN`);
    assert(endorseRes.data.request.branch_approved_by === baUser.id, 'Branch Approver recorded');

    console.log('\n--- FLOW 1: Super Admin approves endorsed request ---');
    const saApprove1 = await api(`/api/product-requests/${staffReq.id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${saToken}` },
      body: JSON.stringify({ quantity_approved: 10, approval_notes: 'HQ Approved' })
    });
    assert(saApprove1.status === 200, 'Super Admin approved endorsed request (200 OK)');
    assert(saApprove1.data.request.status === 'APPROVED', 'Status is now APPROVED');

    // =========================================================================
    // FLOW 2: BRANCH ADMIN -> DIRECT SUPER ADMIN
    // =========================================================================
    console.log('\n--- FLOW 2: Branch Admin creates restock request directly ---');
    const prod2 = await Product.create({
      name: `Flow2 Direct Product ${Date.now()}`,
      sku: `FLOW2-${Date.now()}`,
      price: 8000,
      available_quantity: 100,
      reserved_quantity: 0
    });

    const baReqRes = await api('/api/product-requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${baToken}` },
      body: JSON.stringify({
        items: [{ product_id: prod2.id, quantity_requested: 15 }],
        priority: 'normal',
        notes: 'Direct branch restocking requirement'
      })
    });

    assert(baReqRes.status === 201, 'Branch Admin direct request created (201 Created)');
    const baReq = baReqRes.data.requests[0];
    assert(baReq.status === 'PENDING_SUPERADMIN', `Branch Admin request initial status is directly PENDING_SUPERADMIN (Got: ${baReq.status})`);
    assert(baReq.requested_by === baUser.id, 'Requester ID is recorded as Branch Admin');

    console.log('\n--- FLOW 2: Super Admin directly approves Branch Admin request ---');
    const saApprove2 = await api(`/api/product-requests/${baReq.id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${saToken}` },
      body: JSON.stringify({ quantity_approved: 15, approval_notes: 'HQ Direct Approval' })
    });
    assert(saApprove2.status === 200, 'Super Admin approved Branch Admin direct request (200 OK)');
    assert(saApprove2.data.request.status === 'APPROVED', 'Status is now APPROVED');

    console.log('\n================================================================');
    console.log('🎉 BOTH WORKFLOWS CONFIRMED WORKING 100% AS DESIGNED!');
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
