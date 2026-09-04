const assert = require('assert');

async function login(username, password) {
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:5001';
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  assert.strictEqual(res.status, 200, `Login failed for ${username}: ${res.status}`);
  const data = await res.json();
  return { token: data.token, user: data.user };
}

async function testBranchPerformanceAuth() {
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:5001';
  console.log('=== RUNNING AUTHORIZATION & SCOPING TESTS: GET /api/analytics/branch-performance ===');

  // 1. Super Admin Test: Full visibility (3 branches)
  console.log('\n--- 1. Testing Super Admin Access (Full System Visibility) ---');
  const superAdmin = await login('admin@pcalley.com', 'admin123');
  const saRes = await fetch(`${baseUrl}/api/analytics/branch-performance`, {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(saRes.status, 200, 'Super admin request must succeed');
  const saData = await saRes.json();
  console.log(`✔ Super Admin received ${saData.length} branches:`, saData.map(b => `${b.branchId}: ${b.branchName}`));
  assert.strictEqual(saData.length, 3, 'Super admin must receive all 3 branches');

  // Super admin filtered by branch query param
  const saFilteredRes = await fetch(`${baseUrl}/api/analytics/branch-performance?branchId=3`, {
    headers: { Authorization: `Bearer ${superAdmin.token}` }
  });
  assert.strictEqual(saFilteredRes.status, 200);
  const saFilteredData = await saFilteredRes.json();
  console.log(`✔ Super Admin with ?branchId=3 received:`, saFilteredData.map(b => `${b.branchId}: ${b.branchName}`));
  assert.strictEqual(saFilteredData.length, 1);
  assert.strictEqual(saFilteredData[0].branchId, 3);

  // 2. Branch Admin Test: Scoped strictly to assigned branch_id (3)
  console.log('\n--- 2. Testing Branch Admin Scoping (Branch 3 Manager) ---');
  const branchAdmin = await login('manager_sta_cruz@branch', 'Manager123!');
  const baRes = await fetch(`${baseUrl}/api/analytics/branch-performance`, {
    headers: { Authorization: `Bearer ${branchAdmin.token}` }
  });
  assert.strictEqual(baRes.status, 200, 'Branch admin request must succeed');
  const baData = await baRes.json();
  console.log(`✔ Branch Admin received ${baData.length} branch:`, baData.map(b => `${b.branchId}: ${b.branchName}`));
  assert.strictEqual(baData.length, 1, 'Branch admin must only receive exactly 1 branch');
  assert.strictEqual(baData[0].branchId, 3, 'Branch admin must only receive data for assigned Branch 3');

  // Branch Admin parameter tampering attempt (?branchId=1)
  const baTamperRes = await fetch(`${baseUrl}/api/analytics/branch-performance?branchId=1`, {
    headers: { Authorization: `Bearer ${branchAdmin.token}` }
  });
  assert.strictEqual(baTamperRes.status, 200);
  const baTamperData = await baTamperRes.json();
  console.log(`✔ Branch Admin tampering attempt (?branchId=1) safely resolved to:`, baTamperData.map(b => `${b.branchId}: ${b.branchName}`));
  assert.strictEqual(baTamperData.length, 1, 'Tampered query param must not expose other branches');
  assert.strictEqual(baTamperData[0].branchId, 3, 'Must still return only caller assigned Branch 3');

  // 3. Employee Test: Scoped strictly to assigned branch_id (3)
  console.log('\n--- 3. Testing Employee Scoping (Branch 3 Staff) ---');
  const employee = await login('staff_sta_cruz@branch', 'Staff123!');
  const empRes = await fetch(`${baseUrl}/api/analytics/branch-performance`, {
    headers: { Authorization: `Bearer ${employee.token}` }
  });
  assert.strictEqual(empRes.status, 200, 'Employee request must succeed');
  const empData = await empRes.json();
  console.log(`✔ Employee received ${empData.length} branch:`, empData.map(b => `${b.branchId}: ${b.branchName}`));
  assert.strictEqual(empData.length, 1, 'Employee must only receive exactly 1 branch');
  assert.strictEqual(empData[0].branchId, 3, 'Employee must only receive data for assigned Branch 3');

  console.log('\nAll role-based branch analytics authorization tests passed successfully!');
}

testBranchPerformanceAuth().catch(err => {
  console.error('\n❌ Authorization test failed:', err.message);
  process.exit(1);
});
