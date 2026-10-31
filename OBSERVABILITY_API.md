# ShopEase Observability API Reference

The Observability API provides structured, machine-readable telemetry endpoints designed for consumption by AI Production Incident Investigators, monitoring daemons, and SRE dashboards.

---

## 1. Security & Privacy Guarantees
- **No PII Exposure:** Customer names, 10-digit mobile numbers, residential addresses, and email addresses are automatically sanitized or redacted before being recorded into logs or metrics.
- **No Secrets Exposure:** Database passwords, tokens, API keys, and session cookies are filtered from telemetry payloads.

---

## 2. Endpoints Overview

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Comprehensive system health summary and status |
| `GET` | `/api/observability/metrics` | Live metrics: requests, errors, latency, pool, cache, breaker |
| `GET` | `/api/observability/logs` | Structured JSON log stream with severity/service filters |
| `GET` | `/api/observability/services` | Service architecture topology and dependency graph |
| `GET` | `/api/faults/status` | Current status of all 5 fault scenarios |
| `POST`| `/api/faults/inject` | Inject a specific fault scenario |
| `POST`| `/api/faults/disable` | Disable a specific fault scenario |
| `POST`| `/api/faults/reset` | Global reset: restore all components to healthy state |

---

## 3. Endpoint Specifications

### A. Health Summary (`GET /api/health`)
Returns an overall system health verdict: `HEALTHY`, `DEGRADED`, or `UNHEALTHY`.

#### Sample Response:
```json
{
  "status": "HEALTHY",
  "service": "ShopEase Marketplace",
  "timestamp": "2026-10-31T21:30:00.000Z",
  "uptimeSeconds": 1420,
  "environment": "development",
  "activeFaultsCount": 0,
  "database": {
    "status": "CONNECTED",
    "poolSize": 20,
    "activeConnections": 1,
    "idleConnections": 19,
    "waitingRequests": 0
  },
  "cache": {
    "status": "AVAILABLE",
    "hitRatioPercent": 85.5
  },
  "circuitBreaker": {
    "state": "CLOSED",
    "isAvailable": true
  }
}
```

---

### B. Live Telemetry Metrics (`GET /api/observability/metrics`)
Exposes detailed statistical metrics covering HTTP traffic, latencies, resource pools, and fault impacts.

#### Fields:
- `requests`: Total counts, 2xx, 4xx, 5xx counts, overall error rate %, server error rate %.
- `latency`: Moving average (`avgMs`), maximum recorded (`maxMs`), 95th percentile (`p95Ms`), sample count.
- `database`: PostgreSQL connection pool total, active, idle, waiting requests queue count, pool status (`HEALTHY` / `EXHAUSTED`).
- `cache`: Status (`AVAILABLE` / `UNAVAILABLE`), hits, misses, hit ratio %, recorded errors, key count.
- `circuitBreaker`: Service name, state (`CLOSED` / `OPEN` / `HALF_OPEN`), failure count, failure threshold, remaining reset time ms, total trips, fast rejections.
- `faults`: Summary count and list of active fault configurations.
- `endpoints`: Breakdown of call counts, errors, and latencies per route.

#### Sample Response:
```json
{
  "success": true,
  "data": {
    "timestamp": "2026-10-31T21:30:00.000Z",
    "uptimeSeconds": 1420,
    "requests": {
      "total": 420,
      "success2xx": 405,
      "clientError4xx": 12,
      "serverError5xx": 3,
      "errorCount": 15,
      "errorRatePercent": 3.57,
      "serverErrorRatePercent": 0.71
    },
    "latency": {
      "avgMs": 24.5,
      "maxMs": 2085.3,
      "p95Ms": 145.2,
      "sampleCount": 100
    },
    "database": {
      "totalCount": 20,
      "idleCount": 18,
      "waitingCount": 0,
      "activeConnections": 2,
      "maxPoolSize": 20,
      "poolSize": 20,
      "status": "HEALTHY"
    },
    "cache": {
      "status": "AVAILABLE",
      "outageReason": null,
      "hits": 312,
      "misses": 48,
      "totalLookups": 360,
      "hitRatioPercent": 86.67,
      "errors": 0,
      "keysCount": 8
    },
    "circuitBreaker": {
      "name": "inventory-service",
      "state": "CLOSED",
      "failureCount": 0,
      "failureThreshold": 3,
      "successCount": 0,
      "resetTimeoutMs": 5000,
      "remainingResetMs": 0,
      "totalCalls": 24,
      "totalRejections": 0,
      "totalTrips": 0,
      "isAvailable": true
    },
    "faults": {
      "activeCount": 0,
      "activeFaults": []
    }
  }
}
```

---

### C. Structured JSON Logs (`GET /api/observability/logs`)
Retrieves the in-memory ring buffer of recent structured JSON log entries.

#### Query Parameters:
- `limit`: Maximum number of entries to return (default: `100`, max: `300`).
- `severity`: Filter by level (`INFO`, `WARN`, `ERROR`, `DEBUG`).
- `service`: Filter by originating service (`order-service`, `catalog-service`, `circuit-breaker`, `cache-service`, `fault-manager`).

#### Sample Response:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "timestamp": "2026-10-31T21:30:15.120Z",
      "service": "order-service",
      "severity": "INFO",
      "message": "Order SE-IN-49210 placed successfully for total ₹1,249",
      "endpoint": "/api/orders",
      "status": 201,
      "durationMs": 42.5,
      "metadata": {
        "method": "POST"
      }
    },
    {
      "timestamp": "2026-10-31T21:29:50.040Z",
      "service": "cache-service",
      "severity": "WARN",
      "message": "Cache GET rejected for key 'categories:all': Simulated Cache Cluster Outage",
      "endpoint": "/api/categories",
      "status": null,
      "durationMs": null,
      "metadata": {}
    }
  ]
}
```

---

### D. Services Topology (`GET /api/observability/services`)
Exposes the dependency map across all internal components to assist AI root cause analysis.

#### Sample Response:
```json
{
  "success": true,
  "timestamp": "2026-10-31T21:30:00.000Z",
  "services": [
    {
      "name": "api-gateway",
      "type": "gateway",
      "status": "UP",
      "dependencies": ["catalog-service", "order-service", "category-service", "inventory-service", "cache-service"]
    },
    {
      "name": "catalog-service",
      "type": "internal-service",
      "status": "UP",
      "dependencies": ["database", "cache-service"]
    },
    {
      "name": "order-service",
      "type": "internal-service",
      "status": "UP",
      "dependencies": ["database", "inventory-service"]
    },
    {
      "name": "inventory-service",
      "type": "internal-service",
      "status": "UP",
      "circuitBreaker": { "state": "CLOSED", "isAvailable": true },
      "dependencies": ["database"]
    },
    {
      "name": "cache-service",
      "type": "caching-layer",
      "status": "UP",
      "dependencies": []
    },
    {
      "name": "postgresql-database",
      "type": "data-store",
      "status": "UP",
      "dependencies": []
    }
  ]
}
```
