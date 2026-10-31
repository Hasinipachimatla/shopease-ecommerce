// ShopEase Observability Metrics Tracker

class MetricsTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.startTime = Date.now();
    this.requests = {
      total: 0,
      success2xx: 0,
      clientError4xx: 0,
      serverError5xx: 0
    };
    this.latencies = []; // last 100 request durations in ms
    this.maxLatencyMs = 0;
    this.totalLatencyMs = 0;
    this.endpointStats = {};
  }

  recordRequest({ method, path, status, durationMs }) {
    this.requests.total++;

    if (status >= 200 && status < 300) {
      this.requests.success2xx++;
    } else if (status >= 400 && status < 500) {
      this.requests.clientError4xx++;
    } else if (status >= 500) {
      this.requests.serverError5xx++;
    }

    this.totalLatencyMs += durationMs;
    if (durationMs > this.maxLatencyMs) {
      this.maxLatencyMs = durationMs;
    }

    this.latencies.push(durationMs);
    if (this.latencies.length > 100) {
      this.latencies.shift();
    }

    const routeKey = `${method} ${path.split('?')[0]}`;
    if (!this.endpointStats[routeKey]) {
      this.endpointStats[routeKey] = { count: 0, errors: 0, totalMs: 0, maxMs: 0 };
    }
    const ep = this.endpointStats[routeKey];
    ep.count++;
    if (status >= 400) ep.errors++;
    ep.totalMs += durationMs;
    if (durationMs > ep.maxMs) ep.maxMs = durationMs;
  }

  getMetrics(extraData = {}) {
    const { pool, cacheService, circuitBreaker, faultManager } = extraData;

    const totalReq = this.requests.total;
    const errorCount = this.requests.serverError5xx + this.requests.clientError4xx;
    const errorRate = totalReq > 0 ? Number(((errorCount / totalReq) * 100).toFixed(2)) : 0;
    const serverErrorRate = totalReq > 0 ? Number(((this.requests.serverError5xx / totalReq) * 100).toFixed(2)) : 0;

    const avgLatencyMs = totalReq > 0 ? Number((this.totalLatencyMs / totalReq).toFixed(2)) : 0;

    // Calculate p95 from rolling window
    let p95LatencyMs = 0;
    if (this.latencies.length > 0) {
      const sorted = [...this.latencies].sort((a, b) => a - b);
      const p95Idx = Math.floor(sorted.length * 0.95);
      p95LatencyMs = Number(sorted[Math.min(p95Idx, sorted.length - 1)].toFixed(2));
    }

    // Database connection pool stats
    const dbPoolStats = pool ? {
      totalCount: pool.totalCount || 0,
      idleCount: pool.idleCount || 0,
      waitingCount: pool.waitingCount || 0,
      activeConnections: Math.max(0, (pool.totalCount || 0) - (pool.idleCount || 0)),
      maxPoolSize: (pool.options && pool.options.max) || 20,
      poolSize: (pool.options && pool.options.max) || 20,
      status: (pool.waitingCount > 0 && pool.idleCount === 0) ? 'EXHAUSTED' : 'HEALTHY'
    } : { status: 'UNAVAILABLE' };

    // Cache metrics
    const cacheMetrics = cacheService ? cacheService.getMetrics() : { status: 'NOT_CONFIGURED' };

    // Circuit Breaker metrics
    const cbMetrics = circuitBreaker ? circuitBreaker.getMetrics() : { status: 'NOT_CONFIGURED' };

    // Active faults
    const activeFaults = faultManager ? faultManager.getActiveFaults() : [];

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      requests: {
        total: totalReq,
        success2xx: this.requests.success2xx,
        clientError4xx: this.requests.clientError4xx,
        serverError5xx: this.requests.serverError5xx,
        errorCount: errorCount,
        errorRatePercent: errorRate,
        serverErrorRatePercent: serverErrorRate
      },
      latency: {
        avgMs: avgLatencyMs,
        maxMs: Number(this.maxLatencyMs.toFixed(2)),
        p95Ms: p95LatencyMs,
        sampleCount: this.latencies.length
      },
      database: dbPoolStats,
      cache: cacheMetrics,
      circuitBreaker: cbMetrics,
      faults: {
        activeCount: activeFaults.length,
        activeFaults: activeFaults
      },
      endpoints: this.endpointStats
    };
  }
}

const metricsTracker = new MetricsTracker();
module.exports = { metricsTracker, MetricsTracker };
