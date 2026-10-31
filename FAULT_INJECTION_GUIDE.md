# System Reliability Lab — Fault Injection Guide

## 1. Overview
The ShopEase **System Reliability Lab** transforms the Indian lifestyle & fashion marketplace into a controlled chaos testing environment designed specifically for AI Production Incident Investigators. 

All fault mechanisms interact with real production-grade components: the PostgreSQL 17 connection pool, in-memory caching tier, HTTP routing pipeline, and resilient circuit breakers.

---

## 2. Safety & Isolation Policies
- **Local Testing Only:** Protected by environment checks (`NODE_ENV !== 'production' || ALLOW_FAULT_INJECTION === 'true'`).
- **Safety Auto-Release Timers:** Database connection exhaustion automatically releases held clients after a configurable safety timeout (default: 60s) to prevent permanent deadlocks.
- **Global Reset Control:** `POST /api/faults/reset` immediately restores all 5 scenarios, flushes caches, releases database clients, and resets circuit breakers to `CLOSED`.
- **Zero External Production Impact:** All disruptions are confined strictly to the local ShopEase application.

---

## 3. The 5 Fault Scenarios

### Scenario 1: Database Connection Exhaustion
- **Category:** Database / Infrastructure
- **Mechanism:** Acquires and holds PostgreSQL client connections from `pool.connect()` up to `maxPoolSize` (20), starving incoming queries.
- **Affected Endpoints:** All database-dependent queries (`/api/categories?nocache=true`, `/api/products`, `/api/orders`).
- **Observable Impact:**
  - Queries queue in `pool.waitingCount`.
  - When `connectionTimeoutMillis` (4000ms) elapses, requests fail with `HTTP 503 Service Unavailable: Database connection pool timeout`.
  - Active connections metric reads `20 / 20`.
- **Injection:**
  ```http
  POST /api/faults/inject
  Content-Type: application/json

  { "scenario": "db_exhaustion", "params": { "safetyTimeoutSeconds": 60 } }
  ```
- **Resolution:**
  ```http
  POST /api/faults/disable
  Content-Type: application/json

  { "scenario": "db_exhaustion" }
  ```
- **Recovery Verification:** Call `GET /api/categories?nocache=true`, verify `HTTP 200 OK` and active connections return to normal (< 5).

---

### Scenario 2: High API Latency
- **Category:** Network / Performance
- **Mechanism:** Injects artificial asynchronous delay (default: `2000 ms`) into target endpoints via Express middleware before executing handlers.
- **Affected Endpoints:** `/api/products`, `/api/categories` (configurable).
- **Observable Impact:**
  - Response duration increases by +2000ms.
  - Header `X-Fault-Injected: high_latency` and `X-Simulated-Delay-Ms: 2000` attached to responses.
  - Metrics report elevated `avgMs`, `p95Ms`, and `maxMs`.
- **Injection:**
  ```http
  POST /api/faults/inject
  Content-Type: application/json

  { "scenario": "high_latency", "params": { "delayMs": 2000, "targetEndpoints": ["/api/products"] } }
  ```
- **Resolution:**
  ```http
  POST /api/faults/disable
  Content-Type: application/json

  { "scenario": "high_latency" }
  ```
- **Recovery Verification:** Call `GET /api/products`, verify response time drops to `< 150 ms`.

---

### Scenario 3: Service Error Spike
- **Category:** Application / Stability
- **Mechanism:** Forces target services (e.g., checkout/order service) to return genuine `HTTP 500 Internal Server Error` responses.
- **Affected Endpoints:** `POST /api/orders` (or configured service endpoint).
- **Observable Impact:**
  - Order checkout calls immediately return `HTTP 500`:
    ```json
    {
      "success": false,
      "error": "Internal Server Error: Service Error Spike injected by System Reliability Lab",
      "faultInjected": true,
      "scenario": "service_error_spike"
    }
    ```
  - Metrics `serverError5xx` and `errorRatePercent` elevate immediately.
  - Structured error logs recorded in `/api/observability/logs`.
- **Injection:**
  ```http
  POST /api/faults/inject
  Content-Type: application/json

  { "scenario": "service_error_spike", "params": { "targetService": "order-service", "targetEndpoint": "/api/orders", "httpStatus": 500 } }
  ```
- **Resolution:**
  ```http
  POST /api/faults/disable
  Content-Type: application/json

  { "scenario": "service_error_spike" }
  ```
- **Recovery Verification:** Call `POST /api/orders`, verify `HTTP 201 Created`.

---

### Scenario 4: Cache Failure
- **Category:** Caching / Degradation
- **Mechanism:** Sets cache service availability to `false`, simulating a Redis/Memcached cluster network partition or crash.
- **Affected Endpoints:** `/api/categories`, `/api/products` (cached queries).
- **Observable Impact:**
  - Cache operations throw `CacheUnavailableError: Simulated Cache Cluster Partition`.
  - Application gracefully degrades by falling back to primary PostgreSQL database.
  - Response header contains `X-Cache: UNAVAILABLE`.
  - Observability metrics report `cache.status === 'UNAVAILABLE'` and increment `cache.errors`.
- **Injection:**
  ```http
  POST /api/faults/inject
  Content-Type: application/json

  { "scenario": "cache_failure", "params": { "reason": "Simulated cache cluster partition" } }
  ```
- **Resolution:**
  ```http
  POST /api/faults/disable
  Content-Type: application/json

  { "scenario": "cache_failure" }
  ```
- **Recovery Verification:** Call `GET /api/categories`, verify `cache.status === 'AVAILABLE'` and `X-Cache: HIT` on repeat call.

---

### Scenario 5: Circuit Breaker Trip
- **Category:** Resilience / Cascading Failures
- **Mechanism:** Trips the internal `inventoryCircuitBreaker` wrapping the inventory service dependency after consecutive simulated failures.
- **State Machine:**
  - **CLOSED:** Normal state. Passes requests to inventory service.
  - **OPEN:** Tripped state. Rejects all calls with `HTTP 503 Service Unavailable: inventory-service circuit breaker is OPEN` without contacting downstream service.
  - **HALF_OPEN:** After reset timeout (5000ms), allows limited probe calls to test recovery. Successful probes restore state to `CLOSED`.
- **Affected Endpoints:** `POST /api/orders` (pre-order inventory stock verification), `GET /api/inventory/check`.
- **Observable Impact:**
  - Inventory and checkout queries fast-fail with HTTP 503.
  - Metrics show `circuitBreaker.state === 'OPEN'` and `totalRejections` increments.
- **Injection:**
  ```http
  POST /api/faults/inject
  Content-Type: application/json

  { "scenario": "circuit_breaker_trip", "params": { "reason": "Underlying RPC database connection failure" } }
  ```
- **Probe Mode (Test HALF_OPEN):**
  ```http
  POST /api/faults/circuit-breaker/probe
  ```
- **Resolution:**
  ```http
  POST /api/faults/disable
  Content-Type: application/json

  { "scenario": "circuit_breaker_trip" }
  ```
- **Recovery Verification:** Call `GET /api/inventory/check?productId=1&quantity=1`, verify `HTTP 200 OK` and `circuitBreaker.state === 'CLOSED'`.

---

## 4. Global Emergency Reset
To immediately terminate all active faults and return the system to a clean, healthy baseline:
```http
POST /api/faults/reset
```
Response:
```json
{
  "success": true,
  "message": "All faults reset successfully",
  "activeCount": 0
}
```
