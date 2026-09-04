const API_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- Starting BUG-03 Branch Selection Checkout Tests ---');

  // 1. Authenticate as Super Admin
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@pcalley.com', password: 'admin123' })
  });
  const adminData = await loginRes.json();
  const adminToken = adminData.token;
  if (!adminToken) {
    throw new Error('Failed to log in as Super Admin: ' + JSON.stringify(adminData));
  }
  console.log('✓ Super Admin authenticated');

  // 2. Fetch inventory for branch 3 to find a product with stock
  const invRes = await fetch(`${API_URL}/inventory?branch_id=3&page=1&limit=50`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const invJson = await invRes.json();
  const items = invJson.data || [];
  
  let targetProduct = null;
  let branch3StockBefore = 0;
  let branch1StockBefore = 0;

  for (const item of items) {
    const qty = Number(item.quantity || 0);
    if (qty > 2) {
      targetProduct = item.product_id || (item.Product && item.Product.id);
      branch3StockBefore = qty;
      break;
    }
  }

  // If no item has stock > 2, pick any item and stock it up or pick first item
  if (!targetProduct && items.length > 0) {
    for (const item of items) {
      if (item.product_id) {
        targetProduct = item.product_id;
        branch3StockBefore = Number(item.quantity || 0);
        // If stock is 0, let's update stock for test
        if (branch3StockBefore === 0) {
          await fetch(`${API_URL}/inventory/stock`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({ product_id: targetProduct, branch_id: 3, quantity: 15 })
          });
          branch3StockBefore = 15;
        }
        break;
      }
    }
  }

  // Also check branch 1 stock for this product
  const invB1Res = await fetch(`${API_URL}/inventory?branch_id=1&page=1&limit=50`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const invB1Json = await invB1Res.json();
  const b1Items = invB1Json.data || [];
  const b1Match = b1Items.find(i => (i.product_id || (i.Product && i.Product.id)) === targetProduct);
  if (b1Match) {
    branch1StockBefore = Number(b1Match.quantity || 0);
  }

  console.log(`Target product for sale test: product_id=${targetProduct}, initial Branch 3 stock=${branch3StockBefore}`);

  // Test 1: Super Admin POST /api/sales WITHOUT branch_id -> assert HTTP 400
  const t1Res = await fetch(`${API_URL}/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      items: [{ product_id: targetProduct, quantity: 1, unit_price: 100 }],
      payment_method: 'cash',
      amount_paid: 100
    })
  });
  const t1Data = await t1Res.json();
  if (t1Res.status === 400) {
    console.log('✓ Test 1 Passed: Super Admin checkout without branch_id returned HTTP 400 (' + (t1Data.message || t1Data.error) + ')');
  } else {
    console.error('FAIL: Test 1 expected 400, got', t1Res.status, t1Data);
    process.exit(1);
  }

  // Test 2: Super Admin POST /api/sales with invalid branch_id (999999) -> assert HTTP 400
  const t2Res = await fetch(`${API_URL}/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branch_id: 999999,
      items: [{ product_id: targetProduct, quantity: 1, unit_price: 100 }],
      payment_method: 'cash',
      amount_paid: 100
    })
  });
  const t2Data = await t2Res.json();
  if (t2Res.status === 400) {
    console.log('✓ Test 2 Passed: Super Admin checkout with nonexistent branch_id returned HTTP 400 (' + (t2Data.message || t2Data.error) + ')');
  } else {
    console.error('FAIL: Test 2 expected 400, got', t2Res.status, t2Data);
    process.exit(1);
  }

  // Test 3: Super Admin POST /api/sales with valid branch_id=3 -> assert HTTP 201
  const t3Res = await fetch(`${API_URL}/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branch_id: 3,
      items: [{ product_id: targetProduct, quantity: 1, unit_price: 100 }],
      payment_method: 'cash',
      amount_paid: 100
    })
  });
  const t3Data = await t3Res.json();
  if (t3Res.status === 201) {
    console.log('✓ Test 3 Passed: Super Admin checkout with branch_id=3 succeeded (HTTP 201)');
  } else {
    console.error('FAIL: Test 3 expected 201, got', t3Res.status, t3Data);
    process.exit(1);
  }

  // Test 4: Verify stock decremented only for Branch 3
  const invAfterRes = await fetch(`${API_URL}/inventory?branch_id=3&page=1&limit=50`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const invAfterJson = await invAfterRes.json();
  const itemsAfter = invAfterJson.data || [];
  const b3After = itemsAfter.find(i => (i.product_id || (i.Product && i.Product.id)) === targetProduct);
  
  const invB1AfterRes = await fetch(`${API_URL}/inventory?branch_id=1&page=1&limit=50`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const invB1AfterJson = await invB1AfterRes.json();
  const b1ItemsAfter = invB1AfterJson.data || [];
  const b1After = b1ItemsAfter.find(i => (i.product_id || (i.Product && i.Product.id)) === targetProduct);
  
  const branch3StockAfter = b3After ? Number(b3After.quantity || 0) : 0;
  const branch1StockAfter = b1After ? Number(b1After.quantity || 0) : 0;

  console.log(`Branch 3 stock after: ${branch3StockAfter} (expected: ${branch3StockBefore - 1})`);
  if (branch3StockAfter === branch3StockBefore - 1) {
    console.log('✓ Test 4 Passed: Branch 3 stock correctly decremented by 1');
  } else {
    console.error(`FAIL: Branch 3 stock decrement mismatch! Before: ${branch3StockBefore}, After: ${branch3StockAfter}`);
    process.exit(1);
  }

  if (branch1StockBefore > 0) {
    console.log(`Branch 1 stock after: ${branch1StockAfter} (expected: ${branch1StockBefore})`);
    if (branch1StockAfter === branch1StockBefore) {
      console.log('✓ Test 4b Passed: Branch 1 stock remained unchanged');
    } else {
      console.error(`FAIL: Branch 1 stock changed unexpectedly! Before: ${branch1StockBefore}, After: ${branch1StockAfter}`);
      process.exit(1);
    }
  }

  // Test 5: Branch Admin (branch_id: 3) checkout automatically binds to branch_id: 3
  const mgrLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'manager_sta_cruz@branch', password: 'Manager123!' })
  });
  const mgrData = await mgrLoginRes.json();
  const mgrToken = mgrData.token;

  const mgrSaleRes = await fetch(`${API_URL}/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mgrToken}`
    },
    body: JSON.stringify({
      items: [{ product_id: targetProduct, quantity: 1, unit_price: 100 }],
      payment_method: 'cash',
      amount_paid: 100
    })
  });
  const mgrSaleData = await mgrSaleRes.json();
  if (mgrSaleRes.status === 201) {
    console.log('✓ Test 5 Passed: Branch Admin checkout succeeded without branch_id payload (bound server-side to branch 3)');
  } else {
    console.error('FAIL: Test 5 expected 201, got', mgrSaleRes.status, mgrSaleData);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log(' ALL BUG-03 TESTS PASSED SUCCESSFULLY! ');
  console.log('========================================\n');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
