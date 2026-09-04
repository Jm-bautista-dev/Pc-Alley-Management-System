const assert = require('assert');

// ── 1. UNIT TESTS: Test all import styles for pagination helper ──
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

// ── 2. INTEGRATION TESTS: Test API Endpoints ──
async function runIntegrationTests() {
  console.log('\n=== RUNNING INTEGRATION TESTS: HTTP 200 & Response Structure ===');
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:5001';

  // Login as Super Admin
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin@pcalley.com',
      password: 'admin123'
    })
  });
  assert.strictEqual(loginRes.status, 200, 'Login failed during test setup');
  const { token } = await loginRes.json();
  const headers = { Authorization: `Bearer ${token}` };

  // Test matrix for endpoints: [url, description, expectedLimit]
  const endpointTests = [
    // GET /api/sales/history
    { url: '/api/sales/history', desc: 'GET /api/sales/history (no params)', expLimit: 20, expPage: 1 },
    { url: '/api/sales/history?days=30', desc: 'GET /api/sales/history (?days=30)', expLimit: 20, expPage: 1 },
    { url: '/api/sales/history?page=1&limit=10', desc: 'GET /api/sales/history (?page=1&limit=10)', expLimit: 10, expPage: 1 },

    // GET /api/auth/users
    { url: '/api/auth/users', desc: 'GET /api/auth/users (no params)', expLimit: 20, expPage: 1 },
    { url: '/api/auth/users?days=30', desc: 'GET /api/auth/users (?days=30)', expLimit: 20, expPage: 1 },
    { url: '/api/auth/users?page=1&limit=10', desc: 'GET /api/auth/users (?page=1&limit=10)', expLimit: 10, expPage: 1 },

    // Downstream working comparison endpoints
    { url: '/api/products', desc: 'GET /api/products', isArrayOrData: true },
    { url: '/api/inventory', desc: 'GET /api/inventory', isArrayOrData: true },
    { url: '/api/customers', desc: 'GET /api/customers', isArrayOrData: true },
    { url: '/api/restock-requests', desc: 'GET /api/restock-requests', isArrayOrData: true },
    { url: '/api/expenses', desc: 'GET /api/expenses', isArrayOrData: true },
    { url: '/api/sales/comparative?days=30', desc: 'GET /api/sales/comparative?days=30 (Downstream Matrix)', isArrayOrData: true },
    { url: '/api/sales/trends?days=30', desc: 'GET /api/sales/trends?days=30 (Downstream Trends)', isArrayOrData: true },
    { url: '/api/sales/daily-trends?days=30', desc: 'GET /api/sales/daily-trends?days=30 (Downstream Daily Flow)', isArrayOrData: true },
    { url: '/api/sales/performance?days=30', desc: 'GET /api/sales/performance?days=30 (Downstream Performance)', isArrayOrData: true }
  ];

  for (const t of endpointTests) {
    const res = await fetch(`${baseUrl}${t.url}`, { headers });
    assert.strictEqual(res.status, 200, `${t.desc} must return HTTP 200, got ${res.status}`);
    const body = await res.json();

    if (t.expLimit !== undefined) {
      assert(body && typeof body === 'object', `${t.desc} must return a JSON object`);
      assert(Array.isArray(body.data), `${t.desc} body.data must be an Array`);
      assert(body.pagination, `${t.desc} body.pagination must be defined`);
      assert.strictEqual(body.pagination.page, t.expPage, `${t.desc} pagination.page should be ${t.expPage}`);
      assert.strictEqual(body.pagination.limit, t.expLimit, `${t.desc} pagination.limit should be ${t.expLimit}`);
      assert(typeof body.pagination.total === 'number', `${t.desc} pagination.total must be a number`);
      console.log(`✔ ${t.desc} -> HTTP 200 OK | Items: ${body.data.length} | Total: ${body.pagination.total}`);
    } else {
      const itemsCount = Array.isArray(body) ? body.length : (Array.isArray(body.data) ? body.data.length : 'Object');
      console.log(`✔ ${t.desc} -> HTTP 200 OK | Count: ${itemsCount}`);
    }
  }

  console.log('\nAll unit and regression tests passed successfully!');
}

runIntegrationTests().catch(err => {
  console.error('\n❌ Test failure:', err.message);
  process.exit(1);
});
