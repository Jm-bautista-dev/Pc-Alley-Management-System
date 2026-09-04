const API_BASE = 'http://127.0.0.1:5001/api';

async function runTests() {
  console.log('--- Starting DATA-01 & SEC-03 Test Suite: Production Data Hygiene & Session Security ---');

  // Step 1: Login as Super Admin
  console.log('\n[1] Authenticating as Super Admin...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@pcalley.com', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  const setCookieHeader = loginRes.headers.get('set-cookie');
  console.log(`  Login Status: HTTP ${loginRes.status}`);
  console.log(`  Set-Cookie Header: ${setCookieHeader}`);

  if (loginRes.status !== 200 || !loginData.token) {
    throw new Error('Super Admin login failed: ' + JSON.stringify(loginData));
  }
  if (!setCookieHeader || !setCookieHeader.includes('token=') || !setCookieHeader.toLowerCase().includes('httponly')) {
    throw new Error('Expected HttpOnly token cookie in Set-Cookie header, got: ' + setCookieHeader);
  }
  console.log(' Set-Cookie with HttpOnly verified.');

  const adminToken = loginData.token;
  const cookieToken = setCookieHeader.split(';')[0]; // e.g. "token=eyJ..."

  // Step 2: DATA-01 - Verify test customer accounts (Atong Ang, Alice Guo) are purged
  console.log('\n[2] Verifying test customer accounts are purged...');
  const custRes = await fetch(`${API_BASE}/customers`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const customers = await custRes.json();
  console.log(`  Customers in DB: ${customers.length}`);
  const hasAtong = customers.some(c => /atong ang/i.test(c.name));
  const hasAlice = customers.some(c => /alice guo/i.test(c.name));
  if (hasAtong || hasAlice) {
    throw new Error('Test customers still present in database!');
  }
  console.log(' Confirmed Atong Ang and Alice Guo are purged.');

  // Step 3: DATA-01 - Customer creation email validation
  console.log('\n[3] Testing customer creation with invalid email format...');
  const badEmailRes = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'Test Customer Bad',
      email: 'not-an-email',
      phone: '09123456789'
    })
  });
  console.log(`  Invalid Email Response: HTTP ${badEmailRes.status}`);
  if (badEmailRes.status !== 400) {
    throw new Error(`Expected HTTP 400 for bad email, got ${badEmailRes.status}`);
  }

  console.log('\n[4] Testing customer creation with typo domain (@gamil.com)...');
  const typoEmailRes = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'Test Customer Typo',
      email: 'john@gamil.com',
      phone: '09123456789'
    })
  });
  console.log(`  Typo Email Response: HTTP ${typoEmailRes.status}`);
  if (typoEmailRes.status !== 400) {
    throw new Error(`Expected HTTP 400 for typo domain @gamil.com, got ${typoEmailRes.status}`);
  }

  console.log('\n[5] Testing customer creation with valid email...');
  const goodCustRes = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'Valid Verified Customer',
      email: 'valid.customer@gmail.com',
      phone: '09123456789'
    })
  });
  const goodCustData = await goodCustRes.json();
  console.log(`  Valid Customer Response: HTTP ${goodCustRes.status}, ID: ${goodCustData.id}`);
  if (goodCustRes.status !== 201 || !goodCustData.id) {
    throw new Error('Valid customer creation failed: ' + JSON.stringify(goodCustData));
  }

  // Cleanup created test customer
  await fetch(`${API_BASE}/customers/${goodCustData.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(' Valid customer test & cleanup completed.');

  // Step 4: SEC-03 - Authenticated request using HttpOnly Cookie
  console.log('\n[6] Testing authentication using HttpOnly Cookie header (no Bearer header)...');
  const cookieAuthRes = await fetch(`${API_BASE}/auth/users`, {
    headers: { 'Cookie': cookieToken }
  });
  console.log(`  Cookie Auth Response: HTTP ${cookieAuthRes.status}`);
  if (cookieAuthRes.status !== 200) {
    throw new Error(`Expected HTTP 200 via Cookie auth, got ${cookieAuthRes.status}`);
  }
  console.log(' HttpOnly Cookie authentication succeeded.');

  // Step 5: SEC-03 - Server-side session revocation on logout
  console.log('\n[7] Logging in dedicated test user for session revocation test...');
  const userLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'manager_sta_cruz@branch', password: 'Manager123!' })
  });
  const userLoginData = await userLoginRes.json();
  const sessionToken = userLoginData.token;
  const userCookie = userLoginRes.headers.get('set-cookie')?.split(';')[0];
  console.log(`  Manager Login: HTTP ${userLoginRes.status}`);

  console.log('\n[8] Verifying Manager token is valid prior to logout...');
  const preCheckRes = await fetch(`${API_BASE}/sales/history`, {
    headers: { 'Authorization': `Bearer ${sessionToken}` }
  });
  if (preCheckRes.status !== 200) {
    throw new Error(`Pre-logout request failed: HTTP ${preCheckRes.status}`);
  }
  console.log(' Pre-logout token confirmed valid.');

  console.log('\n[9] Calling POST /api/auth/logout to revoke session...');
  const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Cookie': userCookie
    }
  });
  const logoutSetCookie = logoutRes.headers.get('set-cookie');
  console.log(`  Logout Response: HTTP ${logoutRes.status}, Cleared Cookie: ${logoutSetCookie}`);
  if (logoutRes.status !== 200) {
    throw new Error('Logout failed: HTTP ' + logoutRes.status);
  }

  console.log('\n[10] Testing request with revoked token (must return HTTP 401 Session Revoked)...');
  const postLogoutRes = await fetch(`${API_BASE}/sales/history`, {
    headers: { 'Authorization': `Bearer ${sessionToken}` }
  });
  const postLogoutData = await postLogoutRes.json();
  console.log(`  Post-Logout Response: HTTP ${postLogoutRes.status}, Body: ${JSON.stringify(postLogoutData)}`);
  if (postLogoutRes.status !== 401) {
    throw new Error(`Expected HTTP 401 after logout revocation, got ${postLogoutRes.status}`);
  }
  console.log(' Server-side session revocation confirmed (HTTP 401 Session Revoked).');

  console.log('\n ALL DATA-01 & SEC-03 TESTS PASSED PERFECTLY!\n');
}

runTests().catch(err => {
  console.error('\n TEST FAILED:', err);
  process.exit(1);
});
