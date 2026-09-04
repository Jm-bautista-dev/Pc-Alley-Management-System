const API_URL = 'http://localhost:5001/api';
const { getProductPerformance, getBurnRates } = require('../frontend/src/utils/analytics.js');

async function runTests() {
  console.log('=== STARTING BUG-04 DEAD STOCK & VELOCITY TESTS ===\n');

  // 1. Authenticate as Super Admin
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@pcalley.com', password: 'admin123' })
  });
  const adminData = await loginRes.json();
  const token = adminData.token;
  if (!token) throw new Error('Authentication failed');
  console.log('✔ Super Admin authenticated');

  // 2. Ensure stock exists for product 1 on branch 3 and create a recent sale
  const targetProductId = 1;
  await fetch(`${API_URL}/inventory/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ product_id: targetProductId, branch_id: 3, quantity: 20 })
  });

  const saleRes = await fetch(`${API_URL}/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      branch_id: 3,
      items: [{ product_id: targetProductId, quantity: 2, unit_price: 1500 }],
      payment_method: 'cash',
      amount_paid: 3000
    })
  });
  const saleJson = await saleRes.json();
  if (saleRes.status !== 201) throw new Error('Sale creation failed: ' + JSON.stringify(saleJson));
  console.log(`✔ Created live sale for Product #${targetProductId} (Qty: 2)`);

  // 3. Test Backend Restock Analytics API (/api/inventory/restock-analytics)
  const restockRes = await fetch(`${API_URL}/inventory/restock-analytics?product_id=${targetProductId}&branch_id=3`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const restockData = await restockRes.json();
  console.log('Restock Analytics response:', restockData);

  if (restockData.totalSold30Days >= 2 && restockData.dailySales > 0) {
    console.log(`✔ Test 1 Passed: Restock analytics correctly computed 30-day sold (${restockData.totalSold30Days}) and positive daily velocity (${restockData.dailySales}/day)`);
  } else {
    console.error('FAIL: Expected totalSold30Days >= 2 and dailySales > 0, got', restockData);
    process.exit(1);
  }

  // 4. Test Backend Dead Stock API (/api/analytics/dead-stock)
  const deadStockRes = await fetch(`${API_URL}/analytics/dead-stock?days=30`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const deadStockData = await deadStockRes.json();
  console.log('Dead stock response:', deadStockData);
  const deadList = Array.isArray(deadStockData) ? deadStockData : (deadStockData?.data || []);
  const isProductInDeadStock = deadList.some(p => p.id === targetProductId);

  if (!isProductInDeadStock) {
    console.log(`✔ Test 2 Passed: Product #${targetProductId} with recent sales is NOT in backend dead-stock list`);
  } else {
    console.error(`FAIL: Product #${targetProductId} with recent sales was incorrectly flagged as dead stock in backend!`);
    process.exit(1);
  }

  // 5. Test Frontend Analytics Helpers (getProductPerformance & getBurnRates)
  const salesHistory = [
    {
      id: 101,
      totalAmount: 3000,
      createdAt: new Date().toISOString(),
      customerName: 'Test Customer',
      SaleItems: [{ productId: targetProductId, quantity: 2, unitPrice: 1500 }]
    }
  ];

  const inventoryMock = [
    {
      product_id: targetProductId,
      quantity: 18,
      stock: 18,
      Product: {
        id: targetProductId,
        name: 'NVIDIA RTX 4090 OC',
        createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
        Category: { name: 'GPU' }
      }
    },
    {
      product_id: 999,
      quantity: 5,
      stock: 5,
      Product: {
        id: 999,
        name: 'Stagnant Unsold GPU',
        createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
        Category: { name: 'GPU' }
      }
    },
    {
      product_id: 888,
      quantity: 0,
      stock: 0,
      Product: {
        id: 888,
        name: 'Out of Stock Old GPU',
        createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
        Category: { name: 'GPU' }
      }
    }
  ];

  const { starProducts, deadStock } = getProductPerformance(salesHistory, inventoryMock, []);
  const burnRates = getBurnRates(salesHistory, inventoryMock);

  console.log('\nFrontend Analytics Analysis Results:');
  console.log('Star Products:', starProducts.map(p => ({ name: p.name, sold: p.sold, velocity: p.dailyVelocity })));
  console.log('Dead Stock Items:', deadStock.map(p => ({ name: p.name, stock: p.stock, severity: p.severity })));
  console.log('Burn Rates:', burnRates.map(p => ({ name: p.name, velocity: p.dailyVelocity, daysRemaining: p.daysRemaining })));

  // Assertions:
  // a) Product 1 must NOT be in deadStock
  const p1Dead = deadStock.find(p => p.id === targetProductId || p.name === 'NVIDIA RTX 4090 OC');
  if (!p1Dead) {
    console.log(`✔ Test 3 Passed: Product with recent sales is never flagged as dead stock in frontend analytics`);
  } else {
    console.error('FAIL: Product 1 was found in frontend deadStock list:', p1Dead);
    process.exit(1);
  }

  // b) Product 1 must have positive burn rate velocity
  const p1Burn = burnRates.find(p => p.id === targetProductId);
  if (p1Burn && parseFloat(p1Burn.dailyVelocity) > 0) {
    console.log(`✔ Test 4 Passed: Product 1 has non-zero burn rate daily velocity (${p1Burn.dailyVelocity}/day)`);
  } else {
    console.error('FAIL: Product 1 did not have positive burn rate velocity:', p1Burn);
    process.exit(1);
  }

  // c) Product 999 (0 sales, 5 stock, age >= 30 days) MUST be flagged as Dead Stock
  const p999Dead = deadStock.find(p => p.id === 999 || p.name === 'Stagnant Unsold GPU');
  if (p999Dead && (p999Dead.severity === 'Dead Stock' || p999Dead.severity === 'Slow Moving')) {
    console.log(`✔ Test 5 Passed: Product 999 (0 sales, stock > 0, age > 30d) is correctly flagged as dead stock (${p999Dead.severity})`);
  } else {
    console.error('FAIL: Stagnant Product 999 was not flagged as dead stock:', p999Dead);
    process.exit(1);
  }

  // d) Product 888 (stock = 0) must NOT be flagged as Dead Stock (since it is Out of Stock)
  const p888Dead = deadStock.find(p => p.id === 888);
  if (!p888Dead) {
    console.log(`✔ Test 6 Passed: Out of stock product (stock = 0) is excluded from dead stock holding items`);
  } else {
    console.error('FAIL: Out of stock product was found in deadStock list:', p888Dead);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log(' ALL BUG-04 DEAD STOCK & VELOCITY TESTS PASSED! ');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
