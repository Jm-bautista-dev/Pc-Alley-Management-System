const http = require('http');

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function verifyPermissions() {
  try {
    console.log('--- LOGGING IN AS STAFF_A ---');
    const loginRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'staff_a@pcalley.com', password: 'password123' });

    if (loginRes.status !== 200) throw new Error('Login failed');
    const token = loginRes.data.token;
    console.log('Login successful. Token acquired.');

    console.log('\n--- TESTING GET /api/branches ---');
    const branchesRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/branches',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', branchesRes.status);
    console.log('Branches Count:', branchesRes.data.length);

    console.log('\n--- TESTING GET /api/inventory ---');
    const inventoryRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/inventory',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', inventoryRes.status);
    console.log('Inventory Count:', inventoryRes.data.length);
    if (inventoryRes.data.length > 0) {
      const distinctBranches = [...new Set(inventoryRes.data.map(i => i.branch_id))];
      console.log('Distinct Branch IDs in data:', distinctBranches);
    }

    console.log('\n--- TESTING POST /api/branches (RESTRICTED) ---');
    const createBranchRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/branches',
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, { name: 'Unauthorized Branch' });
    console.log('Status (Expected 403):', createBranchRes.status);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verifyPermissions();
