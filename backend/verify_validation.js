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

async function verifyValidation() {
  try {
    console.log('--- TESTING LOGIN VALIDATION (INVALID EMAIL) ---');
    const loginRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'invalid-email', password: '123' });
    console.log('Status (Expected 400):', loginRes.status);
    console.log('Errors:', JSON.stringify(loginRes.data.errors));

    console.log('\n--- TESTING INVENTORY VALIDATION (NEGATIVE PRICE) ---');
    // We need a token for this, so let's log in a real user first
    const authRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'admin@pcalley.com', password: 'password123' });
    const token = authRes.data.token;

    const inventoryRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/inventory/products',
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, { name: 'Test Product', sku: 'TP-001', price: -50 });
    console.log('Status (Expected 400):', inventoryRes.status);
    console.log('Errors:', JSON.stringify(inventoryRes.data.errors));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verifyValidation();
