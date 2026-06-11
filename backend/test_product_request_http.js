const http = require('http');

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (options.body) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => Promise.resolve(JSON.parse(data || '{}')),
          text: () => Promise.resolve(data)
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testWorkflow() {
  try {
    console.log('--- START PRODUCT REQUEST WORKFLOW TEST (HTTP MODULE) ---');

    // 1. Login as branch admin
    console.log('1. Logging in as Branch Admin...');
    const baLoginRes = await request('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'manager_sta_cruz@branch',
        password: 'Manager123!'
      })
    });
    const baLoginData = await baLoginRes.json();
    if (!baLoginRes.ok) throw new Error(`Branch Admin login failed: ${baLoginData.message}`);
    const baToken = baLoginData.token;
    console.log('✅ Branch Admin logged in.');

    // 2. Login as Super Admin
    console.log('2. Logging in as Super Admin...');
    const saLoginRes = await request('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'superadmin_demo@pcalley.com',
        password: 'Admin123!'
      })
    });
    const saLoginData = await saLoginRes.json();
    if (!saLoginRes.ok) throw new Error(`Super Admin login failed: ${saLoginData.message}`);
    const saToken = saLoginData.token;
    console.log('✅ Super Admin logged in.');

    const headers = {
      'Authorization': `Bearer ${saToken}`,
      'Content-Type': 'application/json'
    };

    // 3. Fetch requests as Super Admin
    console.log('3. Listing all requests...');
    const listRes = await request('http://localhost:5000/api/product-requests', { headers });
    const listRequests = await listRes.json();
    if (!listRes.ok) throw new Error('Failed to list requests');
    
    // Find our pending request
    const pendingReq = listRequests.find(r => r.status === 'Pending');
    if (!pendingReq) {
      console.log('⚠️ No pending request found.');
      return;
    }
    console.log(`Found pending request ID: ${pendingReq.id}, Qty: ${pendingReq.quantity_requested}`);

    // 4. Approve the request (Partial Approval - approve 2 units instead of 3)
    console.log('4. Approving request...');
    const approveRes = await request(`http://localhost:5000/api/product-requests/${pendingReq.id}/approve`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ quantity_approved: 2 })
    });
    const approveData = await approveRes.json();
    if (!approveRes.ok) throw new Error(`Approval failed: ${approveData.message}`);
    console.log(`✅ Request approved. Status: ${approveData.request.status}, Approved Qty: ${approveData.request.quantity_approved}`);

    // 5. Schedule the request
    console.log('5. Scheduling request delivery...');
    const scheduleRes = await request(`http://localhost:5000/api/product-requests/${pendingReq.id}/schedule`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        scheduled_date: '2026-06-20',
        scheduled_time: '14:00:00'
      })
    });
    const scheduleData = await scheduleRes.json();
    if (!scheduleRes.ok) throw new Error(`Scheduling failed: ${scheduleData.message}`);
    console.log(`✅ Request scheduled. Status: ${scheduleData.request.status}, Scheduled: ${scheduleData.request.scheduled_date} at ${scheduleData.request.scheduled_time}`);

    // 6. Complete the request
    console.log('6. Completing transfer...');
    const completeRes = await request(`http://localhost:5000/api/product-requests/${pendingReq.id}/complete`, {
      method: 'PATCH',
      headers
    });
    const completeData = await completeRes.json();
    if (!completeRes.ok) throw new Error(`Completion failed: ${completeData.message}`);
    console.log(`✅ Request completed! Status: ${completeData.request.status}`);

    console.log('--- WORKFLOW TEST PASSED ---');
  } catch (err) {
    console.error('❌ WORKFLOW TEST FAILED:', err.message);
  } finally {
    process.exit();
  }
}

testWorkflow();
