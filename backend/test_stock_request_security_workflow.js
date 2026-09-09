const http = require('http');
const app = require('./src/server');
const sequelize = require('./src/db');
const { Product, BranchProduct, ProductRequest, AuditLog, Notification, StockMovement, Branch, User } = require('./src/models');

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
  console.log('🧪 RUNNING COMPREHENSIVE STOCK REQUEST WORKFLOW & SECURITY TESTS');
  console.log('================================================================');

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`Test API listening on ${BASE_URL}`);
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------
    // Step 1: Login all 3 roles
    // -------------------------------------------------------------
    console.log('\n--- 1. Authenticating Demo Users ---');
    const saLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'superadmin_demo@pcalley.com', password: 'Admin123!' })
    });
    assert(saLogin.ok, 'Super Admin logged in successfully');
    const saToken = saLogin.data.token;

    const baLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'manager_sta_cruz@branch', password: 'Manager123!' })
    });
    assert(baLogin.ok, 'Branch Admin logged in successfully');
    const baToken = baLogin.data.token;

    const staffLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'staff_sta_cruz@branch', password: 'Staff123!' })
    });
    assert(staffLogin.ok, 'Staff Associate logged in successfully');
    const staffToken = staffLogin.data.token;

    // Pick or create test product
    let testProduct = await Product.findOne({ where: { status: 'active' } });
    if (!testProduct) {
      testProduct = await Product.create({
        name: 'Test Gaming GPU RTX 4080',
        sku: `TEST-GPU-${Date.now()}`,
        price: 54999.00,
        available_quantity: 50,
        reserved_quantity: 0
      });
    } else {
      testProduct.available_quantity = Math.max(50, testProduct.available_quantity);
      testProduct.reserved_quantity = 0;
      await testProduct.save();
    }
    const initialAvailable = testProduct.available_quantity;
    console.log(`Using product: '${testProduct.name}' (ID: ${testProduct.id}, Available: ${initialAvailable})`);

    const staCruzBranch = await Branch.findOne({ where: { name: 'Sta Cruz' } });
    assert(staCruzBranch, 'Sta Cruz branch found');

    // Clean up any old pending requests for this product at this branch
    await ProductRequest.destroy({
      where: {
        product_id: testProduct.id,
        branch_id: staCruzBranch.id,
        status: ['PENDING', 'Pending']
      }
    });

    // -------------------------------------------------------------
    // Step 2: Staff and Branch Admin can create Stock Requests
    // -------------------------------------------------------------
    console.log('\n--- 2. Request Creation by Staff and Admin ---');
    const staffReqRes = await api('/api/product-requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        items: [{ product_id: testProduct.id, quantity_requested: 10 }],
        notes: 'Urgent demo requirement for local tournament',
        priority: 'urgent'
      })
    });
    assert(staffReqRes.status === 201, 'Staff can create stock request (201 Created)');
    assert(staffReqRes.data.request_number.startsWith('SR-'), 'Request number generated with SR- prefix');
    const staffRequest = staffReqRes.data.requests[0];
    assert(staffRequest.status === 'PENDING', 'Initial request status is strictly PENDING');

    // Verify Pending does NOT modify inventory
    const refreshedProd = await Product.findByPk(testProduct.id);
    assert(refreshedProd.available_quantity === initialAvailable, 'Pending request does NOT modify warehouse available quantity');
    assert(refreshedProd.reserved_quantity === 0, 'Pending request does NOT reserve stock yet');

    // -------------------------------------------------------------
    // Step 3: Security & RBAC Enforcement (403 Forbidden checks)
    // -------------------------------------------------------------
    console.log('\n--- 3. Strict RBAC Enforcement (Admins & Staff CANNOT Approve/Reject/Fulfill) ---');

    // 3a. Branch Admin attempts to approve
    const baApprove = await api(`/api/product-requests/${staffRequest.id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${baToken}` },
      body: JSON.stringify({ quantity_approved: 10 })
    });
    assert(baApprove.status === 403, 'Branch Admin approving returns 403 Forbidden');

    // 3b. Staff attempts to approve (self-approval attempt)
    const staffApprove = await api(`/api/product-requests/${staffRequest.id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ quantity_approved: 10 })
    });
    assert(staffApprove.status === 403, 'Staff attempting self-approval returns 403 Forbidden');

    // 3c. Branch Admin attempts to reject
    const baReject = await api(`/api/product-requests/${staffRequest.id}/reject`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${baToken}` },
      body: JSON.stringify({ reason: 'Rejected by branch admin unauthorized' })
    });
    assert(baReject.status === 403, 'Branch Admin rejecting returns 403 Forbidden');

    // 3d. Staff attempts to reject
    const staffReject = await api(`/api/product-requests/${staffRequest.id}/reject`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ reason: 'Rejected by staff unauthorized' })
    });
    assert(staffReject.status === 403, 'Staff rejecting returns 403 Forbidden');

    // 3e. Branch Admin attempts to fulfill
    const baFulfill = await api(`/api/product-requests/${staffRequest.id}/fulfill`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${baToken}` }
    });
    assert(baFulfill.status === 403, 'Branch Admin fulfilling returns 403 Forbidden');

    // 3f. Staff attempts to fulfill
    const staffFulfill = await api(`/api/product-requests/${staffRequest.id}/fulfill`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert(staffFulfill.status === 403, 'Staff fulfilling returns 403 Forbidden');

    // -------------------------------------------------------------
    // Step 4: Rejection Validation & Handling
    // -------------------------------------------------------------
    console.log('\n--- 4. Rejection Validation & Stock Integrity ---');
    // 4a. Super Admin attempts to reject without reason
    const emptyReject = await api(`/api/product-requests/${staffRequest.id}/reject`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${saToken}` },
      body: JSON.stringify({ reason: '   ' })
    });
    assert(emptyReject.status === 400, 'Rejection without reason returns 400 Bad Request');

    // Create a second request to test rejection
    const dummyProduct = await Product.create({
      name: 'Dummy Mouse Pad',
      sku: `DUMMY-PAD-${Date.now()}`,
      price: 499.00,
      available_quantity: 20
    });
    const rejReqRes = await api('/api/product-requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        items: [{ product_id: dummyProduct.id, quantity_requested: 5 }]
      })
    });
    const rejReq = rejReqRes.data.requests[0];

    // Super Admin rejects with valid reason
    const validReject = await api(`/api/product-requests/${rejReq.id}/reject`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${saToken}` },
      body: JSON.stringify({ reason: 'Insufficient source warehouse allocation.' })
    });
    assert(validReject.status === 200, 'Super Admin rejects request with reason (200 OK)');
    assert(validReject.data.request.status === 'REJECTED', 'Status updated to REJECTED');
    assert(validReject.data.request.rejection_reason === 'Insufficient source warehouse allocation.', 'Rejection reason saved permanently');

    // Verify inventory untouched by rejected request
    const dummyRefreshed = await Product.findByPk(dummyProduct.id);
    assert(dummyRefreshed.available_quantity === 20, 'Rejected request does not change warehouse stock');

    // -------------------------------------------------------------
    // Step 5: Partial Approval by Super Admin
    // -------------------------------------------------------------
    console.log('\n--- 5. Partial Approval & Stock Reservation ---');
    const approveRes = await api(`/api/product-requests/${staffRequest.id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${saToken}` },
      body: JSON.stringify({
        quantity_approved: 6,
        approval_notes: 'Approved 6 units due to high regional demand.'
      })
    });
    assert(approveRes.status === 200, 'Super Admin approves request (200 OK)');
    assert(approveRes.data.request.status === 'PARTIALLY_APPROVED', 'Status is PARTIALLY_APPROVED for quantity 6/10');
    assert(approveRes.data.request.quantity_approved === 6, 'Approved quantity is 6');

    // Verify Stock Reservation: available decreased by 6, reserved increased by 6
    const postApproveProd = await Product.findByPk(testProduct.id);
    assert(postApproveProd.available_quantity === initialAvailable - 6, `Warehouse available quantity reduced by 6 (${initialAvailable} -> ${initialAvailable - 6})`);
    assert(postApproveProd.reserved_quantity === 6, 'Warehouse reserved quantity increased by 6 (0 -> 6)');

    // Verify destination branch inventory NOT yet modified
    const destBpBefore = await BranchProduct.findOne({
      where: { product_id: testProduct.id, branch_id: staCruzBranch.id }
    });
    const destStockBefore = destBpBefore ? destBpBefore.stock : 0;
    console.log(`Destination branch initial stock: ${destStockBefore}`);

    // -------------------------------------------------------------
    // Step 6: Transition to Processing
    // -------------------------------------------------------------
    console.log('\n--- 6. Transition to Processing ---');
    const processRes = await api(`/api/product-requests/${staffRequest.id}/process`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${saToken}` }
    });
    assert(processRes.status === 200, 'Super Admin sets request to PROCESSING (200 OK)');
    assert(processRes.data.request.status === 'PROCESSING', 'Status is PROCESSING');

    // -------------------------------------------------------------
    // Step 7: Atomic Fulfillment & Inventory Balance Updates
    // -------------------------------------------------------------
    console.log('\n--- 7. Atomic Fulfillment & Physical Inventory Movement ---');
    const fulfillRes = await api(`/api/product-requests/${staffRequest.id}/fulfill`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${saToken}` }
    });
    assert(fulfillRes.status === 200, 'Super Admin fulfills request (200 OK)');
    assert(fulfillRes.data.request.status === 'FULFILLED', 'Status is FULFILLED');
    assert(fulfillRes.data.request.quantity_fulfilled === 6, 'Quantity fulfilled is 6');

    // Check Destination Branch Inventory: MUST increase by 6
    const destBpAfter = await BranchProduct.findOne({
      where: { product_id: testProduct.id, branch_id: staCruzBranch.id }
    });
    assert(destBpAfter && destBpAfter.stock === destStockBefore + 6, `Destination branch stock incremented by exactly 6 (${destStockBefore} -> ${destBpAfter.stock})`);

    // Check Source Warehouse: reserved quantity decreased by 6
    const postFulfillProd = await Product.findByPk(testProduct.id);
    assert(postFulfillProd.reserved_quantity === 0, 'Warehouse reserved quantity cleared (6 -> 0)');

    // Verify Stock Movement was recorded
    const movements = await StockMovement.findAll({
      where: { product_id: testProduct.id },
      order: [['createdAt', 'DESC']],
      limit: 2
    });
    assert(movements.length >= 1, 'Stock Movement records created for fulfillment');

    // Verify Audit Log was recorded
    const auditLogs = await AuditLog.findAll({
      where: { details: { [sequelize.Sequelize.Op.like]: `%${staffRequest.request_number}%` } }
    });
    assert(auditLogs.length >= 3, `Audit trail recorded all lifecycle steps (Found ${auditLogs.length} logs)`);

    // -------------------------------------------------------------
    // Step 8: Prevent Duplicate Fulfillment
    // -------------------------------------------------------------
    console.log('\n--- 8. Prevent Duplicate Fulfillment ---');
    const dupFulfill = await api(`/api/product-requests/${staffRequest.id}/fulfill`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${saToken}` }
    });
    assert(dupFulfill.status === 400, 'Duplicate fulfillment attempt returns 400 Bad Request');
    assert(dupFulfill.data.message.includes('ALREADY been fulfilled'), 'Error message clearly specifies duplicate fulfillment blocked');

    // Check destination inventory was NOT modified again
    await destBpAfter.reload();
    assert(destBpAfter.stock === destStockBefore + 6, 'Destination branch stock remained invariant after duplicate attempt');

    // -------------------------------------------------------------
    // Step 9: Cancellation of Pending Requests
    // -------------------------------------------------------------
    console.log('\n--- 9. Cancellation Policy ---');
    const cancelProd = await Product.create({
      name: 'Cancel Test Product',
      sku: `CANCEL-TEST-${Date.now()}`,
      price: 199.00,
      available_quantity: 10
    });
    const cancelReqRes = await api('/api/product-requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        items: [{ product_id: cancelProd.id, quantity_requested: 2 }]
      })
    });
    const cancelReq = cancelReqRes.data.requests[0];

    const cancelAction = await api(`/api/product-requests/${cancelReq.id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert(cancelAction.status === 200, 'Requester can cancel PENDING request');
    assert(cancelAction.data.request.status === 'CANCELLED', 'Request status updated to CANCELLED');

    // Trying to cancel fulfilled request must fail
    const cancelFulfilled = await api(`/api/product-requests/${staffRequest.id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert(cancelFulfilled.status === 400, 'Cannot cancel fulfilled request (400 Bad Request)');

    console.log('\n================================================================');
    console.log('🎉 ALL 9 STOCK REQUEST SECURITY & WORKFLOW TESTS PASSED PERFECTLY!');
    console.log('================================================================');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    process.exit(process.exitCode || 0);
  }
}

runTests();
