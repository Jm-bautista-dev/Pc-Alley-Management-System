const API_BASE = 'http://127.0.0.1:5001/api';

async function runTests() {
  console.log('--- Starting UI-01 & API-01 Test Suite: Admin Telemetry, Active Stock & CORS ---');

  // Step 1: Super Admin Login
  console.log('\n[1] Authenticating as Super Admin...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@pcalley.com', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  if (loginRes.status !== 200 || !loginData.token) {
    throw new Error('Super Admin login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.token;
  console.log(' Super Admin authenticated.');

  // Step 2: Comparative Sales Active Stock Check
  console.log('\n[2] Testing GET /api/sales/comparative for Active Stock calculation...');
  const compRes = await fetch(`${API_BASE}/sales/comparative`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const compData = await compRes.json();
  console.log(`  Comparative Output Response: HTTP ${compRes.status}, Branches: ${compData.length}`);
  console.log('  Branch Stock Figures:', compData.map(b => ({ id: b.branch_id, name: b.branch_name, total_stock: b.total_stock, total_revenue: b.total_revenue })));

  if (compRes.status !== 200) {
    throw new Error(`Expected HTTP 200, got ${compRes.status}`);
  }
  if (!Array.isArray(compData) || compData.length === 0) {
    throw new Error('Expected non-empty comparative branches array');
  }

  const hasPositiveStock = compData.some(b => b.total_stock > 0);
  if (!hasPositiveStock) {
    throw new Error('All branches returned 0 active stock! Expected positive stock values.');
  }
  console.log(' Active stock calculation confirmed (non-zero stock returned).');

  // Step 3: Audit Log API Check
  console.log('\n[3] Testing GET /api/audit for live activity log entries...');
  const auditRes = await fetch(`${API_BASE}/audit`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const auditData = await auditRes.json();
  console.log(`  Audit Log Response: HTTP ${auditRes.status}, Entries: ${auditData.length}`);
  if (auditData.length > 0) {
    console.log('  Sample Audit Entry:', { id: auditData[0].id, action: auditData[0].action, details: auditData[0].details, user: auditData[0].User?.username });
  }
  if (auditRes.status !== 200) {
    throw new Error(`Expected HTTP 200 for audit logs, got ${auditRes.status}`);
  }
  console.log(' Real-time audit log API verified.');

  // Step 4: CORS Preflight OPTIONS Check on /api/notifications
  console.log('\n[4] Testing CORS Preflight OPTIONS on /api/notifications...');
  const preflightRes = await fetch(`${API_BASE}/notifications`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization,content-type'
    }
  });
  console.log(`  OPTIONS Response: HTTP ${preflightRes.status}`);
  console.log(`  Access-Control-Allow-Origin: ${preflightRes.headers.get('access-control-allow-origin')}`);
  console.log(`  Access-Control-Allow-Credentials: ${preflightRes.headers.get('access-control-allow-credentials')}`);

  if (preflightRes.status !== 200 && preflightRes.status !== 204) {
    throw new Error(`Expected HTTP 200/204 on OPTIONS preflight, got ${preflightRes.status}`);
  }
  if (preflightRes.headers.get('access-control-allow-origin') !== 'http://localhost:3000') {
    throw new Error('CORS Access-Control-Allow-Origin missing or mismatched!');
  }
  console.log(' CORS Preflight OPTIONS verified successfully.');

  // Step 5: Authenticated Notifications Query Check
  console.log('\n[5] Testing Authenticated GET /api/notifications...');
  const notifRes = await fetch(`${API_BASE}/notifications`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Origin': 'http://localhost:3000'
    }
  });
  const notifData = await notifRes.json();
  console.log(`  Notifications Response: HTTP ${notifRes.status}, Items: ${notifData.length}`);
  if (notifRes.status !== 200) {
    throw new Error(`Expected HTTP 200 for notifications, got ${notifRes.status}`);
  }
  console.log(' Authenticated notification fetch verified without 401 noise.');

  console.log('\n ALL UI-01 & API-01 TESTS PASSED PERFECTLY!\n');
}

runTests().catch(err => {
  console.error('\n TEST FAILED:', err);
  process.exit(1);
});
