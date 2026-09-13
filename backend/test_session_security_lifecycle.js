const http = require('http');

const API_BASE = process.env.TEST_API_URL || 'http://127.0.0.1:5000/api';

async function request(url, options = {}) {
  return fetch(url, options);
}

async function runSessionSecurityTests() {
  console.log('================================================================');
  console.log('  PC ALLEY: AUTHENTICATION & SESSION LIFECYCLE SECURITY TESTS   ');
  console.log('================================================================\n');

  // Test 1: Admin Login -> Unique Session ID and HttpOnly Cookie
  console.log('[TEST 1] Logging in as Admin (Session 1)...');
  const loginRes1 = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@pcalley.com', password: 'admin123' })
  });

  if (loginRes1.status !== 200) {
    const body = await loginRes1.text();
    throw new Error(`Admin login 1 failed with status ${loginRes1.status}: ${body}`);
  }

  const loginData1 = await loginRes1.json();
  const setCookie1 = loginRes1.headers.get('set-cookie');
  console.log(`  Login 1 Status: HTTP ${loginRes1.status}`);
  console.log(`  Session 1 ID: ${loginData1.sessionId}`);
  console.log(`  Set-Cookie Header: ${setCookie1}`);

  if (!loginData1.sessionId) {
    throw new Error('Expected unique sessionId in login response!');
  }
  if (!loginData1.token) {
    throw new Error('Expected JWT token in login response!');
  }
  if (!setCookie1 || !setCookie1.includes('token=') || !setCookie1.toLowerCase().includes('httponly')) {
    throw new Error(`Expected HttpOnly cookie in Set-Cookie header, got: ${setCookie1}`);
  }
  console.log('✓ Login 1 successfully established unique session and secure HttpOnly cookie.\n');

  const token1 = loginData1.token;
  const cookie1 = setCookie1.split(';')[0];

  // Test 2: Server-side Session Verification Endpoint (GET /api/auth/session)
  console.log('[TEST 2] Verifying Session 1 with GET /api/auth/session...');
  const verifyRes1 = await request(`${API_BASE}/auth/session`, {
    headers: { 'Authorization': `Bearer ${token1}` }
  });
  if (verifyRes1.status !== 200) {
    throw new Error(`Session verification failed: HTTP ${verifyRes1.status}`);
  }
  const verifyData1 = await verifyRes1.json();
  console.log(`  Session Verification Response:`, verifyData1);
  if (!verifyData1.valid || verifyData1.session?.id !== loginData1.sessionId) {
    throw new Error('Session verification metadata mismatch!');
  }
  console.log('✓ Session 1 verified active on server.\n');

  // Test 3: Cookie-Only Authentication (No Bearer Header)
  console.log('[TEST 3] Testing authentication using HttpOnly Cookie header only...');
  const cookieAuthRes = await request(`${API_BASE}/auth/session`, {
    headers: { 'Cookie': cookie1 }
  });
  if (cookieAuthRes.status !== 200) {
    throw new Error(`Cookie authentication failed: HTTP ${cookieAuthRes.status}`);
  }
  console.log('✓ HttpOnly Cookie authentication succeeded without Bearer header.\n');

  // Test 4: Token Rotation on Re-login (Session 2 replaces Session 1)
  console.log('[TEST 4] Logging in again as Admin (Session 2 - testing session rotation)...');
  const loginRes2 = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@pcalley.com', password: 'admin123' })
  });
  const loginData2 = await loginRes2.json();
  console.log(`  Login 2 Status: HTTP ${loginRes2.status}`);
  console.log(`  Session 2 ID: ${loginData2.sessionId}`);

  if (loginData2.sessionId === loginData1.sessionId) {
    throw new Error('Session ID was not rotated on new login!');
  }
  console.log('✓ Unique new session ID created on second login.\n');

  const token2 = loginData2.token;

  // Test 5: Verify Session 1 is now Invalidated (Rotated)
  console.log('[TEST 5] Verifying rotated Session 1 is invalidated...');
  const checkOldSession = await request(`${API_BASE}/auth/session`, {
    headers: { 'Authorization': `Bearer ${token1}` }
  });
  console.log(`  Old Session Status: HTTP ${checkOldSession.status}`);
  const oldSessionBody = await checkOldSession.json();
  console.log(`  Old Session Body:`, oldSessionBody);

  if (checkOldSession.status !== 401) {
    throw new Error(`Expected HTTP 401 for rotated session, got ${checkOldSession.status}`);
  }
  if (!oldSessionBody.message.includes('Session expired') && !oldSessionBody.message.includes('Please log in again')) {
    throw new Error(`Expected user-friendly "Session expired" message, got: ${oldSessionBody.message}`);
  }
  console.log('✓ Rotated Session 1 was cleanly invalidated with user-friendly message.\n');

  // Test 6: Verify Session 2 is Active
  console.log('[TEST 6] Verifying Session 2 is active...');
  const checkNewSession = await request(`${API_BASE}/auth/session`, {
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  if (checkNewSession.status !== 200) {
    throw new Error(`Session 2 should be active: HTTP ${checkNewSession.status}`);
  }
  console.log('✓ Session 2 is confirmed active.\n');

  // Test 7: Secure Logout and Server-Side Revocation
  console.log('[TEST 7] Calling POST /api/auth/logout for Session 2...');
  const logoutRes = await request(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  const logoutSetCookie = logoutRes.headers.get('set-cookie');
  console.log(`  Logout Status: HTTP ${logoutRes.status}`);
  console.log(`  Cleared Cookie Header: ${logoutSetCookie}`);

  if (logoutRes.status !== 200) {
    throw new Error(`Logout failed with status ${logoutRes.status}`);
  }
  console.log('✓ Logout succeeded.\n');

  // Test 8: Access Protected Route with Revoked Token (Must be 401 Session Expired)
  console.log('[TEST 8] Accessing protected route (/api/sales/history) with logged-out token...');
  const postLogoutRes = await request(`${API_BASE}/sales/history`, {
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  const postLogoutData = await postLogoutRes.json();
  console.log(`  Post-Logout Status: HTTP ${postLogoutRes.status}`);
  console.log(`  Post-Logout Body:`, postLogoutData);

  if (postLogoutRes.status !== 401) {
    throw new Error(`Expected HTTP 401 after logout revocation, got ${postLogoutRes.status}`);
  }
  if (!postLogoutData.message.includes('Session expired') && !postLogoutData.message.includes('Please log in again')) {
    throw new Error(`Expected user-friendly "Session expired" message, got: ${postLogoutData.message}`);
  }
  console.log('✓ Revoked session was blocked with friendly "Session expired. Please log in again."\n');

  // Test 9: Role-Based Authorization Error Differentiation (HTTP 403 Forbidden vs 401 Expired)
  console.log('[TEST 9] Differentiating Forbidden Role (HTTP 403) from Session Expired (HTTP 401)...');
  const staffLoginRes = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'staff_sta_cruz@branch', password: 'Staff123!' })
  });

  if (staffLoginRes.status === 200) {
    const staffData = await staffLoginRes.json();
    const forbiddenRes = await request(`${API_BASE}/auth/users`, {
      headers: { 'Authorization': `Bearer ${staffData.token}` }
    });
    const forbiddenData = await forbiddenRes.json();
    console.log(`  Staff Access to /auth/users Status: HTTP ${forbiddenRes.status}`);
    console.log(`  Response Body:`, forbiddenData);

    if (forbiddenRes.status !== 403) {
      throw new Error(`Expected HTTP 403 for unauthorized role, got ${forbiddenRes.status}`);
    }
    if (forbiddenData.code !== 'FORBIDDEN') {
      throw new Error(`Expected code "FORBIDDEN", got ${forbiddenData.code}`);
    }
    console.log('✓ Correctly differentiated HTTP 403 Forbidden from session expiry.\n');
  } else {
    console.log('  (Skipping staff test as dedicated staff account is not present in local test DB)\n');
  }

  // Test 10: CSRF Protection for Cookie Mutation without Authorization Header
  console.log('[TEST 10] Testing CSRF protection for cookie-only mutations...');
  // Log in again for a fresh cookie
  const csrfLoginRes = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@pcalley.com', password: 'admin123' })
  });
  const csrfCookie = csrfLoginRes.headers.get('set-cookie')?.split(';')[0];

  const maliciousCsrfRes = await request(`${API_BASE}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': csrfCookie,
      'Origin': 'https://evil-hacker-site.com'
    },
    body: JSON.stringify({ name: 'CSRF Exploit' })
  });
  console.log(`  Malicious CSRF Request Status: HTTP ${maliciousCsrfRes.status}`);
  if (maliciousCsrfRes.status !== 403) {
    throw new Error(`Expected HTTP 403 CSRF_BLOCKED, got ${maliciousCsrfRes.status}`);
  }
  const csrfData = await maliciousCsrfRes.json();
  if (csrfData.code !== 'CSRF_BLOCKED') {
    throw new Error(`Expected code "CSRF_BLOCKED", got ${csrfData.code}`);
  }
  console.log('✓ CSRF attack from untrusted origin blocked.\n');

  console.log('================================================================');
  console.log('  ALL 10 AUTHENTICATION & SESSION SECURITY TESTS PASSED!        ');
  console.log('================================================================\n');
}

runSessionSecurityTests().catch(err => {
  console.error('\n❌ SESSION SECURITY TEST FAILED:', err.message);
  process.exit(1);
});
