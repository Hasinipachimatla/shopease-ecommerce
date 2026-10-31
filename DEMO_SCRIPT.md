# ShopEase System Reliability Lab — Faculty Demonstration Script

This document provides a step-by-step guide to demonstrate the **ShopEase System Reliability Lab** and its observability pipeline to faculty, evaluators, and reviewers.

---

## Prerequisites & Setup
1. **Ensure PostgreSQL 17 is running locally** on port `5432` with database `shopease_db`.
2. **Start the ShopEase Application:**
   ```bash
   npm start
   ```
3. **Open the Application in Browser:**
   - Marketplace Home: [http://localhost:5000](http://localhost:5000)
   - Open Reliability Lab by clicking **"🛠️ Reliability Lab"** in the top navigation header.

---

## Demonstration 1: Baseline Normal Operation
1. **Show Catalogue & Search:**
   - Search for *"Kurti"* or *"Jhumkas"*. Show the 36 Indian lifestyle products across all 6 categories.
2. **Show Normal Checkout:**
   - Add any product (e.g. *Chanderi Silk Anarkali*) to cart.
   - Open cart, apply coupon `WELCOME100` (saves ₹100), and click *"Proceed to Checkout"*.
   - Fill in Indian address (e.g. Priya Sharma, Bengaluru `560001`), select Cash on Delivery, and place order.
   - Show instant order confirmation with tracking number (e.g. `SE-IN-XXXXX`).
3. **Show Baseline Health & Telemetry:**
   - In Reliability Lab modal, show the health badge: **HEALTHY (0 Faults Active)**.
   - Click the **"Live Metrics (JSON)"** tab to show `requests.errorRatePercent: 0%` and `database.status: "CONNECTED"`.

---

## Demonstration 2: Scenario 1 — Database Connection Exhaustion

### Step 1: Inject Fault
In the Reliability Lab, click **"⚡ Inject Fault (Exhaust Pool)"** under Scenario 1, or execute:
```bash
curl -X POST http://localhost:5000/api/faults/inject \
  -H "Content-Type: application/json" \
  -d '{"scenario":"db_exhaustion","params":{"safetyTimeoutSeconds":60}}'
```

### Step 2: Observe Application Failure
- The scenario status changes to **ACTIVE (EXHAUSTED)**.
- Active connections gauge reaches **20 / 20**.
- Attempt to load uncached products:
  ```bash
  curl -i http://localhost:5000/api/categories?nocache=true
  ```
  **Observed Failure:** Request hangs for 4 seconds (pool connection timeout) and returns:
  `HTTP/1.1 503 Service Unavailable: Database connection pool timeout`.

### Step 3: Evidence Collection
- Click **"Live Metrics"** tab: `database.waitingCount > 0`, `database.status: "EXHAUSTED"`.
- Click **"Structured Logs"** tab: Shows `[ERROR] [category-service] Database query error: timeout exceeded when trying to connect`.

### Step 4: Recovery & Verification
- Click **"✓ Resolve Fault (Release Connections)"** or execute:
  ```bash
  curl -X POST http://localhost:5000/api/faults/disable \
    -H "Content-Type: application/json" \
    -d '{"scenario":"db_exhaustion"}'
  ```
- Re-run the request:
  ```bash
  curl -i http://localhost:5000/api/categories?nocache=true
  ```
  **Verification:** Returns `HTTP 200 OK` in < 25ms. Pool idle connections restored to 20.

---

## Demonstration 3: Scenario 2 — High API Latency

### Step 1: Inject Fault
Click **"⚡ Inject Fault (+2000ms Delay)"** under Scenario 2, or execute:
```bash
curl -X POST http://localhost:5000/api/faults/inject \
  -H "Content-Type: application/json" \
  -d '{"scenario":"high_latency","params":{"delayMs":2000}}'
```

### Step 2: Observe Application Failure
- Try searching for products in the UI or via terminal:
  ```bash
  curl -w "\nTime taken: %{time_total}s\n" http://localhost:5000/api/products?search=kurti
  ```
  **Observed Failure:** Response takes ~2.05s instead of normal ~0.02s. Header `X-Fault-Injected: high_latency` is visible.

### Step 3: Evidence Collection
- In Reliability Lab, observe **Measured Avg** and **p95 Latency** gauges spiking over 2000ms.
- Structured Logs display: `GET /api/products?search=kurti -> 200 (2024.1ms)`.

### Step 4: Recovery & Verification
- Click **"✓ Resolve Fault (Remove Delay)"** or execute:
  ```bash
  curl -X POST http://localhost:5000/api/faults/disable \
    -H "Content-Type: application/json" \
    -d '{"scenario":"high_latency"}'
  ```
- Re-test: Response completes in < 20ms.

---

## Demonstration 4: Scenario 3 — Service Error Spike

### Step 1: Inject Fault
Click **"⚡ Inject Fault (Force HTTP 500)"** under Scenario 3, or execute:
```bash
curl -X POST http://localhost:5000/api/faults/inject \
  -H "Content-Type: application/json" \
  -d '{"scenario":"service_error_spike","params":{"targetService":"order-service","targetEndpoint":"/api/orders","httpStatus":500}}'
```

### Step 2: Observe Application Failure
- In the store UI, try placing an order, or send a checkout request:
  ```bash
  curl -i -X POST http://localhost:5000/api/orders \
    -H "Content-Type: application/json" \
    -d '{"customer_name":"Test","customer_phone":"9999999999","shipping_address":"Road","city":"Mumbai","state":"Maharashtra","pincode":"400001","items":[{"product_id":1,"quantity":1}]}'
  ```
  **Observed Failure:** Returns `HTTP/1.1 500 Internal Server Error` with JSON body:
  ```json
  {
    "success": false,
    "error": "Internal Server Error: Service Error Spike injected by System Reliability Lab",
    "faultInjected": true
  }
  ```

### Step 3: Evidence Collection
- Telemetry metrics reflect: `requests.serverError5xx: +1`, `errorRatePercent` increases.
- Logs console records structured `[ERROR] [order-service] POST /api/orders -> 500`.

### Step 4: Recovery & Verification
- Click **"✓ Resolve Fault (Restore 200/201)"**. Subsequent checkout attempts succeed immediately with `HTTP 201 Created`.

---

## Demonstration 5: Scenario 4 — Cache Failure

### Step 1: Inject Fault
Click **"⚡ Inject Fault (Simulate Outage)"** under Scenario 4, or execute:
```bash
curl -X POST http://localhost:5000/api/faults/inject \
  -H "Content-Type: application/json" \
  -d '{"scenario":"cache_failure"}'
```

### Step 2: Observe Application Impact
- Query categories endpoint:
  ```bash
  curl -i http://localhost:5000/api/categories
  ```
  **Observed Behavior:** Returns `HTTP 200 OK` via primary PostgreSQL fallback, but header explicitly displays:
  `X-Cache: UNAVAILABLE`.

### Step 3: Evidence Collection
- Telemetry shows: `cache.status: "UNAVAILABLE"`, `cache.errors: +1`.
- Logs show warning: `[WARN] [cache-service] Cache GET rejected: Simulated Cache Cluster Outage. Falling back to PostgreSQL`.

### Step 4: Recovery & Verification
- Click **"✓ Resolve Fault (Restore Cache)"**.
- Re-query categories: First call primes cache (`X-Cache: MISS`), second call returns in < 1ms (`X-Cache: HIT`).

---

## Demonstration 6: Scenario 5 — Circuit Breaker Trip

### Step 1: Inject Fault
Click **"⚡ Inject Fault (Trip to OPEN)"** under Scenario 5, or execute:
```bash
curl -X POST http://localhost:5000/api/faults/inject \
  -H "Content-Type: application/json" \
  -d '{"scenario":"circuit_breaker_trip"}'
```

### Step 2: Observe Application Failure (Fast-Fail Protection)
- Attempt an inventory check:
  ```bash
  curl -i "http://localhost:5000/api/inventory/check?productId=1&quantity=1"
  ```
  **Observed Failure:** Immediate fast-fail with:
  `HTTP/1.1 503 Service Unavailable`:
  ```json
  {
    "success": false,
    "error": "Service \"inventory-service\" unavailable: Circuit breaker is OPEN. Fast-failing request.",
    "circuitBreaker": {
      "state": "OPEN",
      "failureCount": 3
    }
  }
  ```

### Step 3: Probe Transition (HALF_OPEN Mode)
- Click **"🔍 Test Probe (HALF_OPEN)"** in UI or execute:
  ```bash
  curl -X POST http://localhost:5000/api/faults/circuit-breaker/probe
  ```
  **Observed Transition:** Circuit state transitions to **HALF_OPEN** for trial probe evaluation.

### Step 4: Recovery & Verification
- Click **"✓ Resolve Fault (Reset to CLOSED)"** or execute:
  ```bash
  curl -X POST http://localhost:5000/api/faults/disable \
    -H "Content-Type: application/json" \
    -d '{"scenario":"circuit_breaker_trip"}'
  ```
- Call inventory check again: Returns `HTTP 200 OK` with `circuitBreaker.state: "CLOSED"`.

---

## Demonstration 7: Global Emergency Panic Button
1. Inject 3 concurrent faults: Database Exhaustion, High Latency, and Circuit Breaker Trip.
2. Show overall health status degraded to **UNHEALTHY**.
3. Click the top-right button: **"🛡️ Reset All Faults"** (or `POST /api/faults/reset`).
4. Show health badge instantly restore to **HEALTHY (0 Faults Active)**.
