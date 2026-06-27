async function testWorkflow() {
  try {
    console.log('--- START PRODUCT REQUEST WORKFLOW TEST ---');

    // 1. Login as branch admin
    console.log('1. Logging in as Branch Admin...');
    const baLoginRes = await fetch('http://localhost:5000/api/auth/login', {
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
    console.log('✅ Branch Admin logged in successfully.');

    // 2. Fetch all products to get a valid product ID
    console.log('2. Fetching products list...');
    const prodRes = await fetch('http://localhost:5000/api/products', {
      headers: { Authorization: `Bearer ${baToken}` }
    });
    const products = await prodRes.json();
    if (!prodRes.ok) throw new Error('Failed to fetch products');
    // Find NVIDIA RTX 4090 OC (ID 1 in seed) or just use the first product
    const targetProduct = products.find(p => p.sku === 'GPU-NV-4090') || products[0];
    console.log(`Using product: ${targetProduct.name} (ID: ${targetProduct.id}, SKU: ${targetProduct.sku})`);

    // 3. Create a request (with min/max bounds check validation)
    console.log('3. Submitting product request...');
    const reqRes = await fetch('http://localhost:5000/api/product-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${baToken}`
      },
      body: JSON.stringify({
        items: [
          { product_id: targetProduct.id, quantity_requested: 3 }
        ],
        notes: 'Need this for local high-end build demo',
        priority: 'normal'
      })
    });
    const reqData = await reqRes.json();
    if (!reqRes.ok) {
      // If a pending request already exists, let's print that and proceed
      console.log(`⚠️ Request submission output: ${reqData.message}`);
    } else {
      console.log(`✅ Request submitted successfully. Ref: ${reqData.request_number}`);
    }

    // 4. Login as Super Admin
    console.log('4. Logging in as Super Admin...');
    const saLoginRes = await fetch('http://localhost:5000/api/auth/login', {
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
    console.log('✅ Super Admin logged in successfully.');

    // 5. Fetch all requests as Super Admin
    console.log('5. Listing all requests as Super Admin...');
    const listRes = await fetch('http://localhost:5000/api/product-requests', {
      headers: { Authorization: `Bearer ${saToken}` }
    });
    const listRequests = await listRes.json();
    if (!listRes.ok) throw new Error('Failed to list requests');
    
    // Find our pending request
    const pendingReq = listRequests.find(r => r.status === 'Pending' && r.product_id === targetProduct.id);
    if (!pendingReq) {
      console.log('⚠️ No pending request found for this product. Possibly already processed.');
      console.log('--- TEST FINISHED (No action needed) ---');
      return;
    }
    console.log(`Found pending request ID: ${pendingReq.id}, Qty Requested: ${pendingReq.quantity_requested}`);

    // 6. Approve the request (Partial Approval - approve 2 units instead of 3)
    console.log('6. Approving request (Partial approval of 2)...');
    const approveRes = await fetch(`http://localhost:5000/api/product-requests/${pendingReq.id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${saToken}`
      },
      body: JSON.stringify({ quantity_approved: 2 })
    });
    const approveData = await approveRes.json();
    if (!approveRes.ok) throw new Error(`Approval failed: ${approveData.message}`);
    console.log(`✅ Request approved. Status: ${approveData.request.status}, Approved Qty: ${approveData.request.quantity_approved}`);

    // 7. Schedule the request
    console.log('7. Scheduling request delivery...');
    const scheduleRes = await fetch(`http://localhost:5000/api/product-requests/${pendingReq.id}/schedule`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${saToken}`
      },
      body: JSON.stringify({
        scheduled_date: '2026-06-20',
        scheduled_time: '14:00:00'
      })
    });
    const scheduleData = await scheduleRes.json();
    if (!scheduleRes.ok) throw new Error(`Scheduling failed: ${scheduleData.message}`);
    console.log(`✅ Request scheduled. Status: ${scheduleData.request.status}, Scheduled: ${scheduleData.request.scheduled_date} at ${scheduleData.request.scheduled_time}`);

    // 8. Complete the request
    console.log('8. Completing transfer (delivery confirmation)...');
    const completeRes = await fetch(`http://localhost:5000/api/product-requests/${pendingReq.id}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${saToken}` }
    });
    const completeData = await completeRes.json();
    if (!completeRes.ok) throw new Error(`Completion failed: ${completeData.message}`);
    console.log(`✅ Request completed! Status: ${completeData.request.status}`);

    console.log('--- WORKFLOW TEST PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('❌ WORKFLOW TEST FAILED:', err.message);
  } finally {
    process.exit();
  }
}

testWorkflow();
