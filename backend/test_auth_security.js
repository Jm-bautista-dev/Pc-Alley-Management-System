
const API_BASE = 'http://127.0.0.1:5001/api';

async function runTests() {
  console.log('--- Starting BUG-06 & SEC-02 Test Suite: Auth Security & Rate Limiting ---');

  const testUser = 'test_rate_limit_user_' + Date.now();
  const testEmail = testUser + '@pcalley.com';
  const initialPassword = 'Password123!';
  const newPassword = 'NewPassword456!';

  // Step 1: Register or get an admin token to create test user
  console.log('\n[1] Logging in as Super Admin...');
  const adminRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@pcalley.com', password: 'admin123' })
  });
  const adminData = await adminRes.json();
  if (!adminRes.ok) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminData));
  }
  console.log(' Super Admin authenticated.');

  // Create a dedicated test user so we don't lock out the admin account
  console.log(`\n[2] Creating temporary test user: ${testUser}...`);
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminData.token}`
    },
    body: JSON.stringify({
      username: testUser,
      first_name: 'TestRate',
      last_name: 'Limiter',
      password: initialPassword,
      role: 'employee',
      branch_id: 1
    })
  });
  const regData = await regRes.json();
  if (!regRes.ok) {
    throw new Error('Test user registration failed: ' + JSON.stringify(regData));
  }
  console.log(` Test user created with ID ${regData.userId}`);

  // Test successful login initially
  console.log('\n[3] Verifying baseline valid login...');
  const baseLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUser, password: initialPassword })
  });
  if (baseLoginRes.status !== 200) {
    throw new Error('Baseline login failed with status ' + baseLoginRes.status);
  }
  console.log(' Baseline login succeeded (HTTP 200).');

  // Test 5 consecutive failed attempts
  console.log('\n[4] Sending 5 consecutive invalid password attempts...');
  for (let i = 1; i <= 5; i++) {
    const failRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUser, password: 'WrongPassword' + i })
    });
    const failData = await failRes.json();
    console.log(`  Attempt ${i}: HTTP ${failRes.status} -> attemptsRemaining: ${failData.attemptsRemaining}`);
    if (i < 5 && failRes.status !== 401) {
      throw new Error(`Expected HTTP 401 on attempt ${i}, got ${failRes.status}`);
    }
    if (i === 5) {
      if (failRes.status !== 401 && failRes.status !== 429) {
        throw new Error(`Unexpected status on attempt 5: ${failRes.status}`);
      }
    }
  }

  // 6th attempt should be blocked by Rate Limiter / Lockout with HTTP 429
  console.log('\n[5] Testing 6th attempt (must be locked out / throttled)...');
  const lockRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUser, password: initialPassword })
  });
  const lockData = await lockRes.json();
  console.log(`  Attempt 6: HTTP ${lockRes.status}, Retry-After Header: ${lockRes.headers.get('retry-after')}, Body: ${JSON.stringify(lockData)}`);
  
  if (lockRes.status !== 429) {
    throw new Error(`Expected HTTP 429 Too Many Requests, got ${lockRes.status}`);
  }
  if (!lockData.retryAfter && !lockRes.headers.get('retry-after')) {
    throw new Error('Expected Retry-After header or retryAfter in body');
  }
  console.log(' Rate Limiting correctly returned HTTP 429 with lockout timer.');

  // Test Forgot Password flow
  console.log('\n[6] Requesting Password Reset Token via POST /api/auth/forgot-password...');
  const forgotRes = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser })
  });
  const forgotData = await forgotRes.json();
  console.log(`  Forgot Password Response: HTTP ${forgotRes.status}, Data: ${JSON.stringify(forgotData)}`);
  if (forgotRes.status !== 200 || !forgotData.debugToken) {
    throw new Error('Forgot password request failed: ' + JSON.stringify(forgotData));
  }
  const token = forgotData.debugToken;
  console.log(` Received verification token: ${token}`);

  // Test Invalid Token Verification
  console.log('\n[7] Testing Invalid Verification Token (POST /api/auth/verify-reset-token)...');
  const badVerifyRes = await fetch(`${API_BASE}/auth/verify-reset-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser, token: '999999' })
  });
  console.log(`  Bad Token Response: HTTP ${badVerifyRes.status}`);
  if (badVerifyRes.status !== 400) {
    throw new Error(`Expected HTTP 400 for invalid token, got ${badVerifyRes.status}`);
  }
  console.log(' Invalid token rejected correctly.');

  // Test Valid Token Verification
  console.log('\n[8] Testing Valid Verification Token (POST /api/auth/verify-reset-token)...');
  const goodVerifyRes = await fetch(`${API_BASE}/auth/verify-reset-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser, token })
  });
  console.log(`  Good Token Response: HTTP ${goodVerifyRes.status}`);
  if (goodVerifyRes.status !== 200) {
    throw new Error(`Expected HTTP 200 for valid token, got ${goodVerifyRes.status}`);
  }
  console.log(' Valid token verified successfully.');

  // Test Reset Password
  console.log('\n[9] Resetting Password via POST /api/auth/reset-password...');
  const resetRes = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser, token, newPassword })
  });
  const resetData = await resetRes.json();
  console.log(`  Reset Password Response: HTTP ${resetRes.status}, Data: ${JSON.stringify(resetData)}`);
  if (resetRes.status !== 200) {
    throw new Error('Reset password failed: ' + JSON.stringify(resetData));
  }
  console.log(' Password reset succeeded.');

  // Test that old token cannot be reused
  console.log('\n[10] Verifying used token cannot be reused...');
  const reuseRes = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser, token, newPassword: 'AnotherPassword!' })
  });
  if (reuseRes.status !== 400) {
    throw new Error(`Expected HTTP 400 when reusing consumed token, got ${reuseRes.status}`);
  }
  console.log(' Consumed token rejection confirmed.');

  // Test Login with new password (should be unlocked immediately after password reset)
  console.log('\n[11] Logging in with new password (account should now be unlocked)...');
  const newLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUser, password: newPassword })
  });
  const newLoginData = await newLoginRes.json();
  console.log(`  Login with New Password: HTTP ${newLoginRes.status}, User ID: ${newLoginData.user ? newLoginData.user.id : 'N/A'}`);
  if (newLoginRes.status !== 200 || !newLoginData.token) {
    throw new Error('Login with new password failed: ' + JSON.stringify(newLoginData));
  }
  console.log(' New password login successful and account unlocked.');

  // Clean up test user
  console.log('\n[12] Cleaning up test user...');
  const delRes = await fetch(`${API_BASE}/auth/users/${regData.userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminData.token}` }
  });
  console.log(`  Cleanup Response: HTTP ${delRes.status}`);

  console.log('\n ALL SECURITY & AUTH TESTS PASSED PERFECTLY!\n');
}

runTests().catch(err => {
  console.error('\n TEST FAILED:', err);
  process.exit(1);
});
