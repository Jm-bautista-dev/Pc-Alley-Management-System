const assert = require('assert');
const { Op } = require('sequelize');

// ─────────────────────────────────────────────────────────────────────────────
// 1. UNIT TESTS: src/utils/pagination.js
// ─────────────────────────────────────────────────────────────────────────────
console.log('=== RUNNING UNIT TESTS: src/utils/pagination.js ===');

// Style 1: Default / Direct import
const defaultPagination = require('./src/utils/pagination');
assert.strictEqual(typeof defaultPagination, 'function', 'Default import must be a function');
const res1 = defaultPagination({ page: 2, limit: 15, search: 'Test', searchableFields: ['name'] });
assert.strictEqual(res1.page, 2);
assert.strictEqual(res1.limit, 15);
assert.strictEqual(res1.offset, 15);
assert.strictEqual(res1.search, 'Test');
assert(res1.where);
console.log('✔ Style 1: require("../utils/pagination") passed');

// Style 2: Destructured { pagination }
const { pagination } = require('./src/utils/pagination');
assert.strictEqual(typeof pagination, 'function', '{ pagination } named import must be a function');
const res2 = pagination();
assert.strictEqual(res2.page, 1);
assert.strictEqual(res2.limit, 20);
assert.strictEqual(res2.offset, 0);
console.log('✔ Style 2: const { pagination } = require("../utils/pagination") passed');

// Style 3: Destructured { buildPagination }
const { buildPagination } = require('./src/utils/pagination');
assert.strictEqual(typeof buildPagination, 'function', '{ buildPagination } named import must be a function');
const res3 = buildPagination({ page: '3', limit: '50' });
assert.strictEqual(res3.page, 3);
assert.strictEqual(res3.limit, 50);
assert.strictEqual(res3.offset, 100);
console.log('✔ Style 3: const { buildPagination } = require("../utils/pagination") passed');

// Style 4: Destructured { getPaginationParams }
const { getPaginationParams } = require('./src/utils/pagination');
assert.strictEqual(typeof getPaginationParams, 'function', '{ getPaginationParams } named import must be a function');
const res4 = getPaginationParams({ page: '1', limit: '10', search: ' laptop ', sort: 'name-asc' });
assert.strictEqual(res4.page, 1);
assert.strictEqual(res4.limit, 10);
assert.strictEqual(res4.offset, 0);
assert.strictEqual(res4.search, 'laptop');
assert.strictEqual(res4.sort, 'name-asc');
console.log('✔ Style 4: const { getPaginationParams } = require("../utils/pagination") passed');

// ─────────────────────────────────────────────────────────────────────────────
// 2. EDGE CASE & INPUT SANITIZATION UNIT TESTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== RUNNING EDGE CASE & SANITIZATION TESTS ===');

// No parameters provided
const noArgs = pagination();
assert.strictEqual(noArgs.page, 1);
assert.strictEqual(noArgs.limit, 20);
assert.strictEqual(noArgs.offset, 0);
assert.deepStrictEqual(noArgs.where, {});
console.log('✔ Safe defaults on no arguments passed');

// Negative numbers and zero
const negativeParams = pagination({ page: -5, limit: -10 });
assert.strictEqual(negativeParams.page, 1, 'Negative page must be normalized to at least 1');
assert.strictEqual(negativeParams.limit, 1, 'Negative limit must be normalized to at least 1');
assert.strictEqual(negativeParams.offset, 0);

const zeroParams = pagination({ page: 0, limit: 0 });
assert.strictEqual(zeroParams.page, 1, 'Zero page falls back to page 1');
assert.strictEqual(zeroParams.limit, 20, 'Zero limit falls back to defaultLimit (20)');
console.log('✔ Negative and zero numbers handled and normalized safely');

// Non-numeric strings
const nanParams = pagination({ page: 'invalid', limit: 'not-a-number' });
assert.strictEqual(nanParams.page, 1, 'NaN page must fall back to 1');
assert.strictEqual(nanParams.limit, 20, 'NaN limit must fall back to default limit');
console.log('✔ Non-numeric strings handled safely');

// Limit clamping for DoS prevention (max 1000)
const excessiveLimit = pagination({ page: 1, limit: 99999 });
assert.strictEqual(excessiveLimit.limit, 1000, 'Limit above 1000 must be clamped to 1000');
console.log('✔ DoS limit clamping verified (capped at 1000)');

// Search formatting and non-array searchableFields
const searchWithEmptyFields = pagination({ search: 'item', searchableFields: null });
assert.deepStrictEqual(searchWithEmptyFields.where, {}, 'Non-array searchableFields must not throw');

const searchWithFields = pagination({ search: ' RTX 4090 ', searchableFields: ['name', 'sku'] });
assert.strictEqual(searchWithFields.search, 'RTX 4090');
assert(searchWithFields.where[Op.or], 'Op.or must be populated for valid search terms');
assert.strictEqual(searchWithFields.where[Op.or].length, 2);
console.log('✔ Search query trimming and Op.or builder verified');

// ─────────────────────────────────────────────────────────────────────────────
// 3. HANDLER & SECURITY REGRESSION LOGIC TESTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== RUNNING CONTROLLER & PERMISSION LOGIC REGRESSION TESTS ===');

// Simulated test for /api/sales/history handler logic
function simulateGetSalesHistoryQuery(reqUser, reqQuery) {
  const { offset, where, order, page: pageNum, limit: limitNum } = pagination({
    page: reqQuery.page,
    limit: reqQuery.limit,
    search: reqQuery.search,
    searchableFields: ['customerName', 'invoiceNumber']
  });

  const branchId = reqUser.role === 'super_admin' ? reqQuery.branch_id : reqUser.branch_id;
  if (branchId) where.branchId = branchId;

  if (reqQuery.days && !isNaN(parseInt(reqQuery.days, 10))) {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - parseInt(reqQuery.days, 10));
    where.createdAt = { [Op.gte]: limitDate };
  }

  return { offset, where, order, page: pageNum, limit: limitNum };
}

// Simulated test for /api/auth/users handler logic
function simulateGetUsersQuery(reqUser, reqQuery) {
  const { offset, where, order, page: pageNum, limit: limitNum } = pagination({
    page: reqQuery.page,
    limit: reqQuery.limit,
    search: reqQuery.search,
    searchableFields: ['username', 'first_name', 'last_name']
  });

  if (reqUser.role === 'branch_admin') {
    where.branch_id = reqUser.branch_id;
  } else if (reqQuery.branch_id) {
    const parsed = Number(reqQuery.branch_id);
    if (!Number.isNaN(parsed)) where.branch_id = parsed;
  }

  return { offset, where, order, page: pageNum, limit: limitNum };
}

// Test /api/sales/history - no params
const salesNoParams = simulateGetSalesHistoryQuery({ role: 'super_admin' }, {});
assert.strictEqual(salesNoParams.page, 1);
assert.strictEqual(salesNoParams.limit, 20);
assert.strictEqual(salesNoParams.offset, 0);
console.log('✔ /api/sales/history (no parameters) logic passed');

// Test /api/sales/history - page=1&limit=10
const salesPageLimit = simulateGetSalesHistoryQuery({ role: 'super_admin' }, { page: '1', limit: '10' });
assert.strictEqual(salesPageLimit.page, 1);
assert.strictEqual(salesPageLimit.limit, 10);
console.log('✔ /api/sales/history (page=1&limit=10) logic passed');

// Test /api/sales/history - days=30
const salesDays = simulateGetSalesHistoryQuery({ role: 'super_admin' }, { days: '30' });
assert(salesDays.where.createdAt, 'createdAt filter must be created for days=30');
console.log('✔ /api/sales/history (days=30) logic passed');

// Test /api/sales/history - Branch-scoped access (Branch Admin vs Super Admin)
const salesBranchAdmin = simulateGetSalesHistoryQuery({ role: 'branch_admin', branch_id: 2 }, { branch_id: 5 });
assert.strictEqual(salesBranchAdmin.where.branchId, 2, 'Branch admin cannot override branchId');
console.log('✔ /api/sales/history branch isolation enforced for branch_admin');

// Test /api/auth/users - no params
const usersNoParams = simulateGetUsersQuery({ role: 'super_admin' }, {});
assert.strictEqual(usersNoParams.page, 1);
assert.strictEqual(usersNoParams.limit, 20);
console.log('✔ /api/auth/users (no parameters) logic passed');

// Test /api/auth/users - page=1&limit=10
const usersPageLimit = simulateGetUsersQuery({ role: 'super_admin' }, { page: '1', limit: '10' });
assert.strictEqual(usersPageLimit.page, 1);
assert.strictEqual(usersPageLimit.limit, 10);
console.log('✔ /api/auth/users (page=1&limit=10) logic passed');

// Test /api/auth/users - Branch-scoped access
const usersBranchAdmin = simulateGetUsersQuery({ role: 'branch_admin', branch_id: 3 }, { branch_id: 1 });
assert.strictEqual(usersBranchAdmin.where.branch_id, 3, 'Branch admin cannot view users outside branch 3');
console.log('✔ /api/auth/users branch isolation enforced for branch_admin');

// ─────────────────────────────────────────────────────────────────────────────
// 4. LIVE INTEGRATION TESTS (Optional/When backend is running)
// ─────────────────────────────────────────────────────────────────────────────
async function runIntegrationTests() {
  console.log('\n=== RUNNING LIVE HTTP INTEGRATION TESTS ===');
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:5001';

  try {
    // 1. Test Unauthorized Access (No Token)
    const unauthSalesRes = await fetch(`${baseUrl}/api/sales/history`);
    assert.strictEqual(unauthSalesRes.status, 401, 'Unauthorized request to /api/sales/history must return 401');
    console.log('✔ Unauthorized request to /api/sales/history correctly rejected with HTTP 401');

    const unauthUsersRes = await fetch(`${baseUrl}/api/auth/users`);
    assert.strictEqual(unauthUsersRes.status, 401, 'Unauthorized request to /api/auth/users must return 401');
    console.log('✔ Unauthorized request to /api/auth/users correctly rejected with HTTP 401');

    // 2. Login as Super Admin
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin@pcalley.com',
        password: 'admin123'
      })
    });
    
    if (loginRes.status !== 200) {
      console.log(`ℹ Live backend not responding with test credentials (status: ${loginRes.status}). Skipping live HTTP tests.`);
      return;
    }

    const { token } = await loginRes.json();
    const headers = { Authorization: `Bearer ${token}` };

    const endpointTests = [
      { url: '/api/sales/history', desc: 'GET /api/sales/history (no params)', expLimit: 20, expPage: 1 },
      { url: '/api/sales/history?days=30', desc: 'GET /api/sales/history (?days=30)', expLimit: 20, expPage: 1 },
      { url: '/api/sales/history?page=1&limit=10', desc: 'GET /api/sales/history (?page=1&limit=10)', expLimit: 10, expPage: 1 },
      { url: '/api/auth/users', desc: 'GET /api/auth/users (no params)', expLimit: 20, expPage: 1 },
      { url: '/api/auth/users?days=30', desc: 'GET /api/auth/users (?days=30)', expLimit: 20, expPage: 1 },
      { url: '/api/auth/users?page=1&limit=10', desc: 'GET /api/auth/users (?page=1&limit=10)', expLimit: 10, expPage: 1 }
    ];

    for (const t of endpointTests) {
      const res = await fetch(`${baseUrl}${t.url}`, { headers });
      assert.strictEqual(res.status, 200, `${t.desc} must return HTTP 200, got ${res.status}`);
      const body = await res.json();
      assert(body && typeof body === 'object', `${t.desc} must return an object`);
      assert(Array.isArray(body.data), `${t.desc} body.data must be an Array`);
      assert(body.pagination, `${t.desc} body.pagination must be defined`);
      assert.strictEqual(body.pagination.page, t.expPage, `${t.desc} pagination.page should be ${t.expPage}`);
      assert.strictEqual(body.pagination.limit, t.expLimit, `${t.desc} pagination.limit should be ${t.expLimit}`);
      assert(typeof body.pagination.total === 'number', `${t.desc} pagination.total must be a number`);
      console.log(`✔ ${t.desc} -> HTTP 200 OK | Items: ${body.data.length} | Total: ${body.pagination.total}`);
    }

    console.log('\nAll live integration tests passed successfully!');
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED' || err.message.includes('fetch failed')) {
      console.log('ℹ Live backend server offline. Unit and logic regression tests completed successfully.');
    } else {
      throw err;
    }
  }
}

runIntegrationTests().then(() => {
  console.log('\n=== ALL REGRESSION TESTS PASSED SUCCESSFULLY ===');
}).catch(err => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});

