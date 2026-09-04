const sequelize = require('./src/db');
const { Sale, Expense } = require('./src/models');
const API_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log('=== STARTING BUG-05 PROFIT & LOSS LIVE AGGREGATION TESTS ===\n');

  // 1. Authenticate as Super Admin
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@pcalley.com', password: 'admin123' })
  });
  const adminData = await loginRes.json();
  const token = adminData.token;
  if (!token) throw new Error('Super admin login failed');
  console.log('✔ Super Admin authenticated');

  // 2. Query ground truth database sums directly
  const [saleStats] = await sequelize.query(`
    SELECT COALESCE(SUM(totalAmount), 0) as totalRevenue, COUNT(*) as totalSales
    FROM sales
    WHERE status = 'completed'
  `, { type: sequelize.QueryTypes.SELECT });

  const [expenseStats] = await sequelize.query(`
    SELECT COALESCE(SUM(amount), 0) as totalExpenses
    FROM expenses
  `, { type: sequelize.QueryTypes.SELECT });

  const groundTruthRevenue = parseFloat(saleStats.totalRevenue || 0);
  const groundTruthExpenses = parseFloat(expenseStats.totalExpenses || 0);
  console.log(`Database Ground Truth: Revenue = ₱${groundTruthRevenue.toLocaleString()}, Expenses = ₱${groundTruthExpenses.toLocaleString()}`);

  // 3. Call GET /api/analytics/profit-loss as Super Admin
  const pnlRes = await fetch(`${API_URL}/analytics/profit-loss`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (pnlRes.status !== 200) {
    throw new Error(`P&L API failed with HTTP ${pnlRes.status}: ${await pnlRes.text()}`);
  }
  const pnlData = await pnlRes.json();
  const { summary, trends, monthly } = pnlData;

  console.log('API Summary:', summary);

  // Test 1: Assert reported revenue matches ground truth
  const diffRevenue = Math.abs(summary.revenue - groundTruthRevenue);
  if (diffRevenue < 0.01) {
    console.log(`✔ Test 1 Passed: Reported revenue (₱${summary.revenue}) matches ground truth sum of sales (₱${groundTruthRevenue})`);
  } else {
    console.error(`FAIL: Reported revenue (₱${summary.revenue}) does NOT match ground truth (₱${groundTruthRevenue})!`);
    process.exit(1);
  }

  // Test 2: Assert reported operating expenses match ground truth
  const diffExpenses = Math.abs(summary.operatingExpenses - groundTruthExpenses);
  if (diffExpenses < 0.01) {
    console.log(`✔ Test 2 Passed: Reported operating expenses (₱${summary.operatingExpenses}) match ground truth sum (₱${groundTruthExpenses})`);
  } else {
    console.error(`FAIL: Reported expenses (₱${summary.operatingExpenses}) do NOT match ground truth (₱${groundTruthExpenses})!`);
    process.exit(1);
  }

  // Test 3: Assert mathematical integrity: Gross Profit = Revenue - COGS
  const expectedGrossProfit = parseFloat((summary.revenue - summary.cogs).toFixed(2));
  if (Math.abs(summary.grossProfit - expectedGrossProfit) < 0.01) {
    console.log(`✔ Test 3 Passed: Gross profit (₱${summary.grossProfit}) equals Revenue - COGS`);
  } else {
    console.error(`FAIL: Gross profit mismatch: expected ${expectedGrossProfit}, got ${summary.grossProfit}`);
    process.exit(1);
  }

  // Test 4: Assert mathematical integrity: Net Income = Gross Profit - Expenses
  const expectedNetIncome = parseFloat((summary.grossProfit - summary.operatingExpenses).toFixed(2));
  if (Math.abs(summary.netIncome - expectedNetIncome) < 0.01) {
    console.log(`✔ Test 4 Passed: Net income (₱${summary.netIncome}) equals Gross Profit - Expenses`);
  } else {
    console.error(`FAIL: Net income mismatch: expected ${expectedNetIncome}, got ${summary.netIncome}`);
    process.exit(1);
  }

  // Test 5: Verify trends (30 daily data points) and monthly breakdown (12 calendar months)
  if (Array.isArray(trends) && trends.length === 30) {
    console.log(`✔ Test 5a Passed: Daily telemetry contains ${trends.length} continuous day points`);
  } else {
    console.error('FAIL: Daily trends expected 30 data points, got', trends?.length);
    process.exit(1);
  }

  if (Array.isArray(monthly) && monthly.length === 12) {
    console.log(`✔ Test 5b Passed: Monthly breakdown contains 12 active calendar months`);
  } else {
    console.error('FAIL: Monthly breakdown expected 12 months, got', monthly?.length);
    process.exit(1);
  }

  // Test 6: Create new live transaction and expense, then assert immediate real-time update
  const saleCreateRes = await fetch(`${API_URL}/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      branch_id: 3,
      items: [{ product_id: 1, quantity: 1, unit_price: 100 }],
      payment_method: 'cash',
      amount_paid: 1000000
    })
  });
  const saleCreateData = await saleCreateRes.json();
  const addedRevenue = parseFloat(saleCreateData.totalAmount || 0);

  const testExpenseAmount = 150;
  await fetch(`${API_URL}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      category: 'Utilities',
      amount: testExpenseAmount,
      notes: 'Test live P&L expense',
      branchId: 3
    })
  });

  const updatedPnlRes = await fetch(`${API_URL}/analytics/profit-loss`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const updatedData = await updatedPnlRes.json();

  if (Math.abs(updatedData.summary.revenue - (summary.revenue + addedRevenue)) < 0.01 &&
      Math.abs(updatedData.summary.operatingExpenses - (summary.operatingExpenses + testExpenseAmount)) < 0.01) {
    console.log(`✔ Test 6 Passed: Real-time update confirmed (+₱${addedRevenue} revenue, +₱${testExpenseAmount} expense reflected immediately)`);
  } else {
    console.error('FAIL: Live transaction update was not reflected in P&L report:', updatedData.summary);
    process.exit(1);
  }

  // Test 7: Verify Branch Admin Scoping (Branch 3 manager)
  const mgrLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'manager_sta_cruz@branch', password: 'Manager123!' })
  });
  const mgrToken = (await mgrLoginRes.json()).token;

  const mgrPnlRes = await fetch(`${API_URL}/analytics/profit-loss`, {
    headers: { Authorization: `Bearer ${mgrToken}` }
  });
  const mgrPnlData = await mgrPnlRes.json();

  const [b3SaleStats] = await sequelize.query(`
    SELECT COALESCE(SUM(totalAmount), 0) as totalRevenue
    FROM sales
    WHERE status = 'completed' AND branchId = 3
  `, { type: sequelize.QueryTypes.SELECT });

  const expectedB3Revenue = parseFloat(b3SaleStats.totalRevenue || 0);
  if (Math.abs(mgrPnlData.summary.revenue - expectedB3Revenue) < 0.01) {
    console.log(`✔ Test 7 Passed: Branch Admin P&L report strictly scoped to branch 3 transactions (₱${mgrPnlData.summary.revenue})`);
  } else {
    console.error(`FAIL: Branch Admin P&L expected ₱${expectedB3Revenue}, got ₱${mgrPnlData.summary.revenue}`);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log(' ALL BUG-05 PROFIT & LOSS LIVE TESTS PASSED! ');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
