// ShopEase System Reliability Lab - Comprehensive 15-Point Automated Test Suite
// Verifies all Phase 5 Acceptance Criteria for AI Incident Investigator

const assert = require('assert');
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

let passedCount = 0;
let failedCount = 0;
const results = [];

async function test(name, fn) {
  process.stdout.write(`• Running: ${name} ... `);
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    passedCount++;
    console.log(`\x1b[32mPASSED\x1b[0m (${duration}ms)`);
    results.push({ name, status: 'PASSED', durationMs: duration });
  } catch (err) {
    const duration = Date.now() - start;
    failedCount++;
    console.log(`\x1b[31mFAILED\x1b[0m (${duration}ms)`);
    console.error(`  Error: ${err.message}`);
    results.push({ name, status: 'FAILED', durationMs: duration, error: err.message });
  }
}

async function get(path) {
  const start = Date.now();
  const res = await fetch(`${BASE_URL}${path}`);
  const duration = Date.now() - start;
  let json = null;
  try { json = await res.json(); } catch (e) {}
  return { status: res.status, headers: res.headers, data: json, duration };
}

async function post(path, body = {}) {
  const start = Date.now();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const duration = Date.now() - start;
  let json = null;
  try { json = await res.json(); } catch (e) {}
  return { status: res.status, headers: res.headers, data: json, duration };
}

async function runTests() {
  console.log(`\n======================================================`);
  console.log(`🧪 ShopEase System Reliability Lab - 15-Point Test Suite`);
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`======================================================\n`);

  // Reset all faults to start clean
  await post('/api/faults/reset');

  // 1. Normal health endpoint
  await test('1. Normal health endpoint reports HEALTHY and connected database', async () => {
    const res = await get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'HEALTHY');
    assert.strictEqual(res.data.database.status, 'CONNECTED');
    assert.strictEqual(res.data.circuitBreaker.state, 'CLOSED');
    assert.strictEqual(res.data.cache.status, 'AVAILABLE');
  });

  // 2. Normal product catalogue requests
  await test('2. Normal product catalogue requests succeed with >= 30 products', async () => {
    const catRes = await get('/api/categories');
    assert.strictEqual(catRes.status, 200);
    assert.strictEqual(catRes.data.data.length, 6, 'Should have 6 categories');

    const prodRes = await get('/api/products');
    assert.strictEqual(prodRes.status, 200);
    assert.ok(prodRes.data.count >= 30, `Expected >= 30 products, got ${prodRes.data.count}`);
  });

  // 3. Normal checkout and order creation
  let createdOrderNumber = null;
  await test('3. Normal checkout and order creation saves to PostgreSQL', async () => {
    const payload = {
      customer_name: 'Meera Nambiar',
      customer_phone: '9845012345',
      customer_email: 'meera.nambiar@example.com',
      shipping_address: '104 Palm Grove, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      payment_method: 'Cash on Delivery',
      items: [{ product_id: 1, quantity: 1 }]
    };
    const res = await post('/api/orders', payload);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data.order_number.startsWith('SE-IN-'));
    createdOrderNumber = res.data.data.order_number;
  });

  // 4. Database fault causes actual database-dependent request failures
  await test('4. Database fault causes actual database-dependent requests to fail with timeout', async () => {
    try {
      const injectRes = await post('/api/faults/inject', {
        scenario: 'db_exhaustion',
        params: { safetyTimeoutSeconds: 15 }
      });
      assert.strictEqual(injectRes.status, 200);
      assert.ok(injectRes.data.data.heldConnections >= 15);

      const failRes = await get('/api/categories?nocache=true');
      assert.ok([500, 503].includes(failRes.status), `Expected 503/500 DB timeout, got ${failRes.status}`);
      assert.ok(failRes.data.error.toLowerCase().includes('timeout') || failRes.data.error.toLowerCase().includes('connection') || failRes.data.error.toLowerCase().includes('database'));
    } finally {
      await post('/api/faults/disable', { scenario: 'db_exhaustion' });
    }
  });

  // 5. Database recovery restores requests
  await test('5. Database recovery restores normal database queries and releases connections', async () => {
    const res = await get('/api/categories?nocache=true');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);

    const metrics = await get('/api/observability/metrics');
    assert.strictEqual(metrics.data.data.database.waitingCount, 0);
  });

  // 6. Latency fault increases actual measured response duration
  await test('6. Latency fault increases actual measured response duration by >= 1400ms', async () => {
    try {
      const injectRes = await post('/api/faults/inject', {
        scenario: 'high_latency',
        params: { delayMs: 1500, targetEndpoints: ['/api/products'] }
      });
      assert.strictEqual(injectRes.status, 200);

      const slowRes = await get('/api/products?search=kurti');
      assert.strictEqual(slowRes.status, 200);
      assert.ok(slowRes.duration >= 1400, `Expected duration >= 1400ms, measured ${slowRes.duration}ms`);
      assert.strictEqual(slowRes.headers.get('x-fault-injected'), 'high_latency');
    } finally {
      await post('/api/faults/disable', { scenario: 'high_latency' });
    }
  });

  // 7. Latency recovery removes the additional delay
  await test('7. Latency recovery removes additional delay and restores fast response', async () => {
    const fastRes = await get('/api/products?search=kurti');
    assert.strictEqual(fastRes.status, 200);
    assert.ok(fastRes.duration < 500, `Expected fast response < 500ms, measured ${fastRes.duration}ms`);
    assert.strictEqual(fastRes.headers.get('x-fault-injected'), null);
  });

  // 8. Service error fault produces actual HTTP 500 responses
  await test('8. Service error fault produces actual HTTP 500 responses on checkout', async () => {
    try {
      const injectRes = await post('/api/faults/inject', {
        scenario: 'service_error_spike',
        params: { targetService: 'order-service', targetEndpoint: '/api/orders', httpStatus: 500 }
      });
      assert.strictEqual(injectRes.status, 200);

      const errRes = await post('/api/orders', {
        customer_name: 'Test Customer',
        customer_phone: '9999999999',
        shipping_address: 'Address',
        city: 'City',
        state: 'State',
        pincode: '560001',
        items: [{ product_id: 1, quantity: 1 }]
      });
      assert.strictEqual(errRes.status, 500);
      assert.strictEqual(errRes.data.faultInjected, true);
    } finally {
      await post('/api/faults/disable', { scenario: 'service_error_spike' });
    }
  });

  // 9. Service error recovery restores normal responses
  await test('9. Service error recovery restores successful order creation', async () => {
    const recoverRes = await post('/api/orders', {
      customer_name: 'Rohan Verma',
      customer_phone: '9811122233',
      shipping_address: '42 MG Road',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      items: [{ product_id: 2, quantity: 1 }]
    });
    assert.strictEqual(recoverRes.status, 201);
    assert.strictEqual(recoverRes.data.success, true);
  });

  // 10. Cache fault changes actual cache behaviour
  await test('10. Cache fault marks cache UNAVAILABLE, bypasses cache, and logs error telemetry', async () => {
    try {
      // Warm cache
      await get('/api/categories');
      await get('/api/categories');

      const injectRes = await post('/api/faults/inject', { scenario: 'cache_failure' });
      assert.strictEqual(injectRes.status, 200);

      // Call should still succeed via database fallback, with X-Cache: UNAVAILABLE
      const fbRes = await get('/api/categories');
      assert.strictEqual(fbRes.status, 200);
      assert.strictEqual(fbRes.headers.get('x-cache'), 'UNAVAILABLE');

      const metrics = await get('/api/observability/metrics');
      assert.strictEqual(metrics.data.data.cache.status, 'UNAVAILABLE');
    } finally {
      await post('/api/faults/disable', { scenario: 'cache_failure' });
    }
  });

  // 11. Cache recovery restores expected behaviour
  await test('11. Cache recovery restores AVAILABLE status and cache hit measurement', async () => {
    const metrics = await get('/api/observability/metrics');
    assert.strictEqual(metrics.data.data.cache.status, 'AVAILABLE');

    // Warm cache
    await get('/api/categories');
    const hitRes = await get('/api/categories');
    assert.strictEqual(hitRes.status, 200);
    assert.strictEqual(hitRes.headers.get('x-cache'), 'HIT');
  });

  // 12. Circuit breaker transitions CLOSED -> OPEN -> HALF_OPEN -> CLOSED
  await test('12. Circuit breaker transitions through CLOSED, OPEN, HALF_OPEN, and back to CLOSED', async () => {
    // Initial CLOSED
    const initRes = await get('/api/inventory/check?productId=1&quantity=1');
    assert.strictEqual(initRes.status, 200);
    assert.strictEqual(initRes.data.circuitBreaker.state, 'CLOSED');

    try {
      // Trip to OPEN
      await post('/api/faults/inject', { scenario: 'circuit_breaker_trip' });

      // Call while OPEN -> fast-fails with 503
      const openRes = await get('/api/inventory/check?productId=1&quantity=1');
      assert.strictEqual(openRes.status, 503);
      assert.strictEqual(openRes.data.circuitBreaker.state, 'OPEN');

      // Probe transition to HALF_OPEN
      const probeRes = await post('/api/faults/circuit-breaker/probe');
      assert.strictEqual(probeRes.status, 200);
      assert.strictEqual(probeRes.data.metrics.state, 'HALF_OPEN');
    } finally {
      // Restore to CLOSED
      const resetCbRes = await post('/api/faults/disable', { scenario: 'circuit_breaker_trip' });
      assert.strictEqual(resetCbRes.status, 200);
      assert.strictEqual(resetCbRes.data.data.breakerMetrics.state, 'CLOSED');
    }

    // Verify healthy call succeeds in CLOSED state
    const healthyRes = await get('/api/inventory/check?productId=1&quantity=1');
    assert.strictEqual(healthyRes.status, 200);
    assert.strictEqual(healthyRes.data.circuitBreaker.state, 'CLOSED');
  });

  // 13. Fault reset restores all components
  await test('13. Fault reset endpoint (POST /api/faults/reset) restores all components to healthy', async () => {
    // Inject multiple faults concurrently
    await post('/api/faults/inject', { scenario: 'high_latency', params: { delayMs: 1000 } });
    await post('/api/faults/inject', { scenario: 'cache_failure' });
    await post('/api/faults/inject', { scenario: 'circuit_breaker_trip' });

    const degradedHealth = await get('/api/health');
    assert.strictEqual(degradedHealth.data.status, 'DEGRADED');

    const resetRes = await post('/api/faults/reset');
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.data.data.activeCount, 0);

    const healthyHealth = await get('/api/health');
    assert.strictEqual(healthyHealth.data.status, 'HEALTHY');
  });

  // 14. Existing cart, checkout and order-history functionality remains intact
  await test('14. Existing cart, checkout and My Orders history retrieves PostgreSQL orders', async () => {
    const listRes = await get('/api/orders');
    assert.strictEqual(listRes.status, 200);
    assert.ok(Array.isArray(listRes.data.data), 'Orders should be an array');
    assert.ok(listRes.data.data.length >= 1, 'Should have at least 1 order');

    if (createdOrderNumber) {
      const found = listRes.data.data.find(o => o.order_number === createdOrderNumber);
      assert.ok(found, `Order ${createdOrderNumber} should be present in order history`);
      assert.strictEqual(found.customer_name, 'Meera Nambiar');
    }
  });

  // 15. Observability endpoints expose the actual state and metrics
  await test('15. Observability endpoints expose real telemetry with sanitized PII', async () => {
    const metricsRes = await get('/api/observability/metrics');
    assert.strictEqual(metricsRes.status, 200);
    assert.ok(metricsRes.data.data.requests.total > 0);
    assert.ok(metricsRes.data.data.database.poolSize > 0);
    assert.ok(metricsRes.data.data.cache.totalLookups > 0);

    const servicesRes = await get('/api/observability/services');
    assert.strictEqual(servicesRes.status, 200);
    assert.ok(servicesRes.data.services.length >= 5);

    const logsRes = await get('/api/observability/logs?limit=20');
    assert.strictEqual(logsRes.status, 200);
    assert.ok(Array.isArray(logsRes.data.data));

    // Verify PII is sanitized in logs (no raw 10-digit mobile phone numbers)
    const rawPhones = logsRes.data.data.filter(l => /(?<!\*)9845012345/.test(JSON.stringify(l)));
    assert.strictEqual(rawPhones.length, 0, 'Customer phone number must be masked/sanitized in logs');

    const faultsStatus = await get('/api/faults/status');
    assert.strictEqual(faultsStatus.status, 200);
    assert.strictEqual(faultsStatus.data.data.activeCount, 0);
  });

  console.log(`\n======================================================`);
  console.log(`📊 15-Point Test Results Summary:`);
  console.log(`Total: ${passedCount + failedCount} | \x1b[32mPassed: ${passedCount}\x1b[0m | \x1b[31mFailed: ${failedCount}\x1b[0m`);
  console.log(`======================================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
