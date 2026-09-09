const BacktestingEngine = require('./src/services/forecasting/BacktestingEngine');
const { getAvailableModels, NaiveForecastModel, MovingAverageModel, SimpleExponentialSmoothingModel, HoltLinearTrendModel, LinearRegressionModel, SeasonalNaiveModel } = require('./src/services/forecasting/models');
const { BenchmarkRun, BenchmarkResult } = require('./src/models');

const BASE_URL = 'http://localhost:5000/api';

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('🔬 PC ALLEY: FORECASTING BENCHMARK VERIFICATION SUITE');
  console.log('====================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, testName) {
    totalCount++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
    }
  }

  // --- UNIT TEST 1: Candidate Models Train & Predict ---
  console.log('\n--- 1. Testing Candidate Forecast Models ---');
  try {
    const models = getAvailableModels({ frequency: 'daily' });
    assert(models.length === 6, 'All 6 candidate forecast models instantiated');

    const sampleHistory = [
      { period: '2026-01-01', value: 100 },
      { period: '2026-01-02', value: 120 },
      { period: '2026-01-03', value: 110 },
      { period: '2026-01-04', value: 130 },
      { period: '2026-01-05', value: 150 },
    ];

    for (const model of models) {
      model.train(sampleHistory);
      const pred = model.predict(1);
      assert(typeof pred === 'number' && !isNaN(pred) && pred >= 0, `Model ${model.getName()} trained & predicted valid value (${pred})`);
    }
  } catch (err) {
    assert(false, `Candidate models test threw error: ${err.message}`);
  }

  // --- UNIT TEST 2: BacktestingEngine Mathematical Correctness & Zero Leakage ---
  console.log('\n--- 2. Testing Walk-Forward Rolling Origin & Zero Leakage ---');
  try {
    const engine = new BacktestingEngine({ minTrainPoints: 4, testSteps: 3 });
    const series = [
      { period: '2026-01-01', value: 100 },
      { period: '2026-01-02', value: 110 },
      { period: '2026-01-03', value: 120 },
      { period: '2026-01-04', value: 130 },
      { period: '2026-01-05', value: 140 }, // Step 1: train on first 4, test on 5th
      { period: '2026-01-06', value: 150 }, // Step 2: train on first 5, test on 6th
      { period: '2026-01-07', value: 160 }, // Step 3: train on first 6, test on 7th
    ];

    const models = [
      new NaiveForecastModel(),
      new LinearRegressionModel(),
    ];

    const evalResult = engine.evaluate(models, series);
    assert(evalResult.hasSufficientData === true, 'Sufficient data identified');
    assert(evalResult.timeline.length === 3, 'Evaluated exactly 3 test steps');
    assert(evalResult.trainPoints === 4, 'Train set starts at 4 points');
    
    // For Naive: step 1 pred should be 130 (vs actual 140 -> err = -10)
    // Step 2 pred should be 140 (vs actual 150 -> err = -10)
    // Step 3 pred should be 150 (vs actual 160 -> err = -10)
    // Sum actual = 140 + 150 + 160 = 450
    // Sum abs error = 10 + 10 + 10 = 30
    // WAPE = (30 / 450) * 100 = 6.67%
    // MAE = 10
    // Bias = -10 (under-forecasting)
    const naiveRes = evalResult.models.find(m => m.modelId === 'naive');
    assert(naiveRes !== undefined, 'Naive model results captured');
    assert(naiveRes.mae === 10, `Naive MAE is exactly 10 (actual: ${naiveRes.mae})`);
    assert(Math.abs(naiveRes.wape - 6.67) < 0.1, `Naive WAPE is mathematically correct (6.67%, got: ${naiveRes.wape}%)`);
    assert(naiveRes.bias === -10, `Naive Bias is exactly -10 (under-forecasting, got: ${naiveRes.bias})`);
    assert(naiveRes.directionalBias === 'Under-forecasting', 'Directional bias labeled Under-forecasting');
  } catch (err) {
    assert(false, `BacktestingEngine test threw error: ${err.message}`);
  }

  // --- UNIT TEST 3: Data Sufficiency Guard (N < 4) ---
  console.log('\n--- 3. Testing Data Sufficiency Guard ---');
  try {
    const engine = new BacktestingEngine({ minTrainPoints: 4 });
    const sparseSeries = [
      { period: '2026-01-01', value: 50 },
      { period: '2026-01-02', value: 80 },
    ];
    const sparseResult = engine.evaluate([new NaiveForecastModel()], sparseSeries);
    assert(sparseResult.hasSufficientData === false, 'Properly rejects series with N < 4');
    assert(sparseResult.minRequired === 4, 'Reports minimum 4 periods required');
  } catch (err) {
    assert(false, `Data sufficiency guard threw error: ${err.message}`);
  }

  // --- INTEGRATION TEST 4: Backend API Security & RBAC ---
  console.log('\n--- 4. Testing Backend API Security & RBAC ---');
  let superAdminToken = '';
  let branchAdminToken = '';

  try {
    // 4a. Authenticate Super Admin
    const superRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'superadmin_demo@pcalley.com',
        password: 'Admin123!'
      })
    });
    superAdminToken = superRes.data?.token;
    assert(!!superAdminToken, 'Super Admin logged in successfully');

    // 4b. Authenticate Branch Admin
    const branchRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'manager_sta_cruz@branch',
        password: 'Manager123!'
      })
    });
    branchAdminToken = branchRes.data?.token;
    assert(!!branchAdminToken, 'Branch Admin logged in successfully');
  } catch (err) {
    console.error('Login error:', err.message);
  }

  // 4c. Super Admin executes Benchmark API
  try {
    const benchRes = await apiRequest('/analytics/benchmark?scopeType=all&frequency=monthly', {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert(benchRes.status === 200, 'Super Admin GET /api/analytics/benchmark returns 200 OK');
    assert(Array.isArray(benchRes.data?.models), 'Returns candidate models comparison array');
    assert(benchRes.data?.bestModel !== undefined, 'Returns best model recommendation');
    console.log(`   🏆 Best Model Identified: ${benchRes.data?.bestModel?.modelName} (WAPE: ${benchRes.data?.bestModel?.wape}%)`);
  } catch (err) {
    assert(false, `Super Admin benchmark call failed: ${err.message}`);
  }

  // 4d. Super Admin retrieves Benchmark History
  try {
    const histRes = await apiRequest('/analytics/benchmark/history', {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert(histRes.status === 200, 'Super Admin GET /api/analytics/benchmark/history returns 200 OK');
    assert(Array.isArray(histRes.data?.runs), 'Returns historical benchmark runs');
    assert(histRes.data?.runs?.length > 0, `Recorded at least 1 benchmark run in DB (${histRes.data?.runs?.length} runs found)`);
  } catch (err) {
    assert(false, `Super Admin benchmark history call failed: ${err.message}`);
  }

  // 4e. Branch Admin ATTEMPTS Benchmark API -> MUST BE 403 FORBIDDEN
  try {
    const res = await apiRequest('/analytics/benchmark', {
      headers: { Authorization: `Bearer ${branchAdminToken}` }
    });
    assert(res.status === 403, `Branch Admin correctly received 403 Forbidden for /benchmark (status: ${res.status})`);
  } catch (err) {
    assert(false, `Branch Admin call threw unexpected error: ${err.message}`);
  }

  // 4f. Branch Admin ATTEMPTS Benchmark History -> MUST BE 403 FORBIDDEN
  try {
    const res = await apiRequest('/analytics/benchmark/history', {
      headers: { Authorization: `Bearer ${branchAdminToken}` }
    });
    assert(res.status === 403, `Branch Admin correctly received 403 Forbidden for /benchmark/history (status: ${res.status})`);
  } catch (err) {
    assert(false, `Branch Admin history call threw unexpected error: ${err.message}`);
  }

  // 4g. Unauthenticated request -> MUST BE 401 / 403
  try {
    const res = await apiRequest('/analytics/benchmark');
    assert(res.status === 401 || res.status === 403, `Unauthenticated request blocked with status: ${res.status}`);
  } catch (err) {
    assert(false, `Unauthenticated call threw unexpected error: ${err.message}`);
  }

  // --- INTEGRATION TEST 5: Database Persistence Verification ---
  console.log('\n--- 5. Database Schema & Persistence Verification ---');
  try {
    const latestRun = await BenchmarkRun.findOne({
      order: [['createdAt', 'DESC']],
      include: [{ model: BenchmarkResult, as: 'results' }]
    });

    assert(!!latestRun, 'Found latest BenchmarkRun record in database');
    assert(latestRun.status === 'completed', `Latest run status is 'completed' (actual: ${latestRun.status})`);
    assert(latestRun.results && latestRun.results.length > 0, `Latest run persisted ${latestRun.results?.length} model results in benchmark_results`);
    assert(latestRun.best_model !== null, `Recorded best model: ${latestRun.best_model}`);
    assert(latestRun.best_wape !== null, `Recorded best WAPE: ${latestRun.best_wape}%`);
  } catch (err) {
    assert(false, `Database verification failed: ${err.message}`);
  }

  // --- INTEGRATION TEST 6: Frontend Route & Recommendation Integration ---
  console.log('\n--- 6. Frontend Route & Forecast Integration ---');
  try {
    // Check main forecasting analytics response includes benchmark recommendation
    const foreRes = await apiRequest('/analytics/forecasting', {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert(foreRes.status === 200, 'Super Admin GET /api/analytics/forecasting returns 200 OK');
    assert(foreRes.data?.benchmarkRecommendation !== undefined, 'Forecasting response includes benchmarkRecommendation field');
    if (foreRes.data?.benchmarkRecommendation) {
      console.log(`   💡 Linked Recommendation: ${foreRes.data.benchmarkRecommendation.bestModel} (WAPE: ${foreRes.data.benchmarkRecommendation.wape}%)`);
    }

    // Check frontend benchmark page availability
    const frontRes = await fetch('http://localhost:3000/forecasting/benchmark');
    assert(frontRes.status === 200, 'Frontend page http://localhost:3000/forecasting/benchmark responds with HTTP 200');
  } catch (err) {
    assert(false, `Frontend / forecasting integration failed: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passedCount}/${totalCount} tests passed (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log('====================================================\n');

  process.exit(passedCount === totalCount ? 0 : 1);
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
