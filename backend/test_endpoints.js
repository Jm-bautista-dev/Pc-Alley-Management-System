async function main() {
  try {
    console.log('Attempting login...');
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin@pcalley.com',
        password: 'admin123'
      })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(`Login failed: ${loginData.message}`);
    const token = loginData.token;
    console.log('Login successful. Token acquired.');

    const headers = { Authorization: `Bearer ${token}` };

    const endpoints = [
      '/api/sales/history?days=30',
      '/api/inventory',
      '/api/sales/comparative?days=30',
      '/api/sales/trends',
      '/api/sales/performance',
      '/api/inventory/global-status'
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(`http://localhost:5001${endpoint}`, { headers });
        const data = await res.json();
        if (res.status === 500) {
          console.log(`❌ ${endpoint} - Status: 500 - Error: ${data.error}`);
        } else {
          console.log(`✅ ${endpoint} - Status: ${res.status} - Data items: ${Array.isArray(data) ? data.length : 'Object'}`);
        }

      } catch (err) {
        console.log(`❌ ${endpoint} - Error: ${err.message}`);
      }
    }
  } catch (err) {
    console.error('Fatal error:', err.message);
  }
}

main();

