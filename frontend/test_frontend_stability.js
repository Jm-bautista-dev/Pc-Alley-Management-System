const assert = require('assert');

async function testFrontendStability() {
  const baseUrl = process.env.TEST_FRONTEND_URL || 'http://localhost:3000';
  console.log(`=== STARTING FRONTEND STABILITY & LOAD VERIFICATION ===`);
  console.log(`Target URL: ${baseUrl}`);

  // 1. Check Health Endpoint
  console.log('\n--- 1. Testing Health Check Endpoint (/api/health) ---');
  let healthRes;
  try {
    healthRes = await fetch(`${baseUrl}/api/health`);
  } catch (err) {
    throw new Error(`Frontend server is not reachable at ${baseUrl}. Ensure the server is running. (${err.message})`);
  }

  assert.strictEqual(healthRes.status, 200, `/api/health must return HTTP 200, got ${healthRes.status}`);
  const healthData = await healthRes.json();
  console.log('✔ /api/health returned HTTP 200 OK');
  console.log('  Status:', healthData.status);
  console.log('  Uptime:', healthData.uptimeSeconds, 'seconds');
  console.log('  Memory (MB):', healthData.memory);
  assert.strictEqual(healthData.status, 'ok', 'Health status must be "ok"');

  // 2. Multi-Route Normal Navigation Simulation
  const routesToTest = [
    '/',
    '/dashboard',
    '/inventory',
    '/products',
    '/sales',
    '/reports/stock',
    '/reports/purchase-sale',
    '/admin',
    '/staff',
    '/customers',
    '/expenses',
    '/api/health'
  ];

  console.log('\n--- 2. Simulating Normal User Navigation Across App Routes ---');
  const routeResults = {};
  for (const route of routesToTest) {
    const start = Date.now();
    const res = await fetch(`${baseUrl}${route}`);
    const elapsed = Date.now() - start;
    routeResults[route] = { status: res.status, durationMs: elapsed };
    assert.notStrictEqual(res.status, 503, `Route ${route} returned HTTP 503 Outage!`);
    console.log(`✔ [${res.status}] ${route.padEnd(25)} - ${elapsed}ms`);
  }

  // 3. Concurrency & Load Stress Test (100 total requests across routes)
  console.log('\n--- 3. Running Concurrent Load Test (100 multi-route requests) ---');
  const totalRequests = 100;
  const batchSize = 10;
  let successCount = 0;
  let outage503Count = 0;
  let otherErrorCount = 0;
  const latencies = [];

  for (let i = 0; i < totalRequests; i += batchSize) {
    const batch = Array.from({ length: batchSize }).map((_, idx) => {
      const targetRoute = routesToTest[(i + idx) % routesToTest.length];
      const start = Date.now();
      return fetch(`${baseUrl}${targetRoute}`)
        .then(res => {
          const dur = Date.now() - start;
          latencies.push(dur);
          if (res.status === 200 || res.status === 307 || res.status === 308) {
            successCount++;
          } else if (res.status === 503) {
            outage503Count++;
          } else {
            otherErrorCount++;
          }
          return res.status;
        })
        .catch(err => {
          outage503Count++;
          return 'ERR_NETWORK';
        });
    });

    await Promise.all(batch);
    process.stdout.write(`\rProgress: ${Math.min(i + batchSize, totalRequests)} / ${totalRequests} requests completed...`);
  }
  console.log('\n');

  // 4. Memory & Resource Verification Post-Load
  const postHealthRes = await fetch(`${baseUrl}/api/health`);
  const postHealthData = await postHealthRes.json();
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const maxLatency = Math.max(...latencies);
  const minLatency = Math.min(...latencies);

  console.log('=== STABILITY VERIFICATION REPORT ===');
  console.log(`Total Requests Processed: ${totalRequests}`);
  console.log(`Successful Responses:     ${successCount} / ${totalRequests} (${(successCount / totalRequests) * 100}%)`);
  console.log(`503 Outage Count:         ${outage503Count} (0.00% target)`);
  console.log(`Other Status Codes:       ${otherErrorCount}`);
  console.log(`Latency - Avg: ${avgLatency}ms | Min: ${minLatency}ms | Max: ${maxLatency}ms`);
  console.log(`Post-Load Memory RSS:     ${postHealthData.memory?.rssMB} MB`);
  console.log(`Post-Load Heap Used:      ${postHealthData.memory?.heapUsedMB} MB / ${postHealthData.memory?.heapTotalMB} MB`);
  console.log(`Server Uptime:            ${postHealthData.uptimeSeconds} seconds`);

  assert.strictEqual(outage503Count, 0, 'There must be ZERO 503 outage errors during navigation/load.');
  assert(successCount >= totalRequests * 0.95, 'At least 95% of requests must succeed normally.');

  console.log('\n✔ Frontend stability confirmed under sustained navigation and load.');
}

testFrontendStability().catch(err => {
  console.error('\n❌ Frontend stability test failed:', err.message);
  process.exit(1);
});
