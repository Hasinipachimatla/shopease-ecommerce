// ShopEase System Reliability Lab - Central Fault Manager
const { logger } = require('../observability/logger');
const { cacheService } = require('../services/cacheService');
const { inventoryCircuitBreaker } = require('../services/circuitBreaker');
const { inventoryService } = require('../services/inventoryService');

class FaultManager {
  constructor(pool) {
    this.pool = pool;

    // Safety timeout for database exhaustion (prevents permanent lockout)
    this.dbExhaustionTimer = null;
    this.exhaustionClients = [];

    // State storage for the 5 scenarios
    this.faults = {
      db_exhaustion: {
        id: 'db_exhaustion',
        name: 'Database Connection Exhaustion',
        category: 'Database / Infrastructure',
        active: false,
        injectedAt: null,
        description: 'Exhausts the PostgreSQL connection pool by acquiring and holding all available clients. Affected database-dependent requests will queue and timeout.',
        observableImpact: 'DB-dependent API queries hang and return 500/503 timeouts. Active pool connections max out at 20/20 with high waiting request counts.',
        params: {
          heldCount: 0,
          maxConnections: 20,
          safetyTimeoutSeconds: 60
        }
      },
      high_latency: {
        id: 'high_latency',
        name: 'High API Latency',
        category: 'Network / Performance',
        active: false,
        injectedAt: null,
        description: 'Introduces configurable artificial delay into selected API endpoints, simulating network congestion or slow downstream operations.',
        observableImpact: 'Response times on catalogue and product endpoints increase by 2000ms+. Average and max latency metrics sharply elevate.',
        params: {
          delayMs: 2000,
          targetEndpoints: ['/api/products', '/api/categories']
        }
      },
      service_error_spike: {
        id: 'service_error_spike',
        name: 'Service Error Spike',
        category: 'Application / Stability',
        active: false,
        injectedAt: null,
        description: 'Forces critical application services (such as order checkout or inventory) to return genuine HTTP 500 Internal Server Errors.',
        observableImpact: 'Checkout or target service calls fail with HTTP 500. Server error rate and 5xx metric counts spike immediately.',
        params: {
          targetService: 'order-service',
          targetEndpoint: '/api/orders',
          httpStatus: 500,
          errorCount: 0
        }
      },
      cache_failure: {
        id: 'cache_failure',
        name: 'Cache Failure',
        category: 'Caching / Degradation',
        active: false,
        injectedAt: null,
        description: 'Simulates complete cache cluster unavailability or network partition, forcing cache reads to fail and fallback to primary database.',
        observableImpact: 'Cache status reports UNAVAILABLE. Cache hit ratio drops to 0%, cache error logs are recorded, and response latency may increase.',
        params: {
          outageReason: 'Simulated Cache Cluster Partition / Network Timeout'
        }
      },
      circuit_breaker_trip: {
        id: 'circuit_breaker_trip',
        name: 'Circuit Breaker Trip',
        category: 'Resilience / Cascading Failures',
        active: false,
        injectedAt: null,
        description: 'Simulates repeated downstream inventory dependency failures, tripping the circuit breaker from CLOSED to OPEN to prevent cascade.',
        observableImpact: 'Consecutive failures exceed threshold (3), opening the circuit. Subsequent calls fast-fail with 503 until reset timeout transitions to HALF_OPEN.',
        params: {
          failureThreshold: 3,
          resetTimeoutMs: 5000,
          trippedState: 'CLOSED'
        }
      }
    };
  }

  // Security check: Only allow in non-production or explicitly allowed environments
  isFaultInjectionAllowed() {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_FAULT_INJECTION !== 'true') {
      return false;
    }
    return true;
  }

  isFaultActive(scenarioId) {
    return this.faults[scenarioId] ? this.faults[scenarioId].active : false;
  }

  getFault(scenarioId) {
    return this.faults[scenarioId] || null;
  }

  getActiveFaults() {
    return Object.values(this.faults).filter(f => f.active);
  }

  getStatus() {
    // Sync dynamic params before returning
    if (this.faults.db_exhaustion.active) {
      this.faults.db_exhaustion.params.heldCount = this.exhaustionClients.length;
    }
    this.faults.circuit_breaker_trip.params.trippedState = inventoryCircuitBreaker.state;

    return {
      timestamp: new Date().toISOString(),
      allowed: this.isFaultInjectionAllowed(),
      environment: process.env.NODE_ENV || 'development',
      activeCount: this.getActiveFaults().length,
      scenarios: this.faults
    };
  }

  // ================= 1. DATABASE CONNECTION EXHAUSTION =================
  async injectDbExhaustion(safetyTimeoutSeconds = 60) {
    if (!this.isFaultInjectionAllowed()) {
      throw new Error('Fault injection forbidden in production environment');
    }

    if (this.faults.db_exhaustion.active) {
      return { success: true, message: 'Database exhaustion already active', held: this.exhaustionClients.length };
    }

    const maxClients = (this.pool.options && this.pool.options.max) || 20;
    this.exhaustionClients = [];
    logger.warn('fault-manager', `Injecting Database Connection Exhaustion: attempting to hold up to ${maxClients} connections`);

    // Acquire pool connections until pool is exhausted
    try {
      const promises = [];
      for (let i = 0; i < maxClients; i++) {
        // connect with timeout
        promises.push(
          this.pool.connect().then(client => {
            this.exhaustionClients.push(client);
          }).catch(err => {
            logger.warn('fault-manager', `Pool exhausted after acquiring ${this.exhaustionClients.length} clients: ${err.message}`);
          })
        );
      }
      await Promise.all(promises);
    } catch (err) {
      logger.error('fault-manager', `Error acquiring exhaustion clients: ${err.message}`);
    }

    this.faults.db_exhaustion.active = true;
    this.faults.db_exhaustion.injectedAt = new Date().toISOString();
    this.faults.db_exhaustion.params.heldCount = this.exhaustionClients.length;
    this.faults.db_exhaustion.params.safetyTimeoutSeconds = safetyTimeoutSeconds;

    // Safety timeout: automatically release to prevent permanent lockout
    if (this.dbExhaustionTimer) clearTimeout(this.dbExhaustionTimer);
    this.dbExhaustionTimer = setTimeout(() => {
      logger.info('fault-manager', `Safety timeout (${safetyTimeoutSeconds}s) reached: releasing exhausted DB connections`);
      this.resolveDbExhaustion();
    }, safetyTimeoutSeconds * 1000);

    logger.error('fault-manager', `Database Connection Exhaustion ACTIVE: ${this.exhaustionClients.length} clients held out of ${maxClients}`);
    return {
      success: true,
      scenario: 'db_exhaustion',
      heldConnections: this.exhaustionClients.length,
      maxPoolSize: maxClients,
      safetyTimeoutSeconds: safetyTimeoutSeconds
    };
  }

  resolveDbExhaustion() {
    if (this.dbExhaustionTimer) {
      clearTimeout(this.dbExhaustionTimer);
      this.dbExhaustionTimer = null;
    }

    const count = this.exhaustionClients.length;
    for (const client of this.exhaustionClients) {
      try {
        client.release();
      } catch (e) {
        // ignore client already released
      }
    }
    this.exhaustionClients = [];

    this.faults.db_exhaustion.active = false;
    this.faults.db_exhaustion.injectedAt = null;
    this.faults.db_exhaustion.params.heldCount = 0;

    logger.info('fault-manager', `Database Connection Exhaustion RESOLVED: ${count} connections released back to pool`);
    return { success: true, releasedConnections: count };
  }

  // ================= 2. HIGH API LATENCY =================
  injectHighLatency(delayMs = 2000, targetEndpoints = ['/api/products', '/api/categories']) {
    if (!this.isFaultInjectionAllowed()) {
      throw new Error('Fault injection forbidden in production environment');
    }

    this.faults.high_latency.active = true;
    this.faults.high_latency.injectedAt = new Date().toISOString();
    this.faults.high_latency.params.delayMs = Number(delayMs) || 2000;
    this.faults.high_latency.params.targetEndpoints = targetEndpoints;

    logger.warn('fault-manager', `High API Latency ACTIVE: +${this.faults.high_latency.params.delayMs}ms delay on [${targetEndpoints.join(', ')}]`);
    return { success: true, scenario: 'high_latency', delayMs: this.faults.high_latency.params.delayMs };
  }

  resolveHighLatency() {
    this.faults.high_latency.active = false;
    this.faults.high_latency.injectedAt = null;
    logger.info('fault-manager', 'High API Latency RESOLVED: artificial delay removed');
    return { success: true, scenario: 'high_latency' };
  }

  // ================= 3. SERVICE ERROR SPIKE =================
  injectServiceErrorSpike(targetService = 'order-service', targetEndpoint = '/api/orders', httpStatus = 500) {
    if (!this.isFaultInjectionAllowed()) {
      throw new Error('Fault injection forbidden in production environment');
    }

    this.faults.service_error_spike.active = true;
    this.faults.service_error_spike.injectedAt = new Date().toISOString();
    this.faults.service_error_spike.params.targetService = targetService;
    this.faults.service_error_spike.params.targetEndpoint = targetEndpoint;
    this.faults.service_error_spike.params.httpStatus = httpStatus;
    this.faults.service_error_spike.params.errorCount = 0;

    logger.error('fault-manager', `Service Error Spike ACTIVE: ${targetService} (${targetEndpoint}) will return HTTP ${httpStatus}`);
    return { success: true, scenario: 'service_error_spike', targetService, httpStatus };
  }

  recordServiceError() {
    if (this.faults.service_error_spike.active) {
      this.faults.service_error_spike.params.errorCount++;
    }
  }

  resolveServiceErrorSpike() {
    this.faults.service_error_spike.active = false;
    this.faults.service_error_spike.injectedAt = null;
    logger.info('fault-manager', 'Service Error Spike RESOLVED: normal responses restored');
    return { success: true, scenario: 'service_error_spike' };
  }

  // ================= 4. CACHE FAILURE =================
  injectCacheFailure(reason = 'Simulated Cache Cluster Partition / Network Outage') {
    if (!this.isFaultInjectionAllowed()) {
      throw new Error('Fault injection forbidden in production environment');
    }

    this.faults.cache_failure.active = true;
    this.faults.cache_failure.injectedAt = new Date().toISOString();
    this.faults.cache_failure.params.outageReason = reason;

    cacheService.setAvailability(false, reason);
    logger.error('fault-manager', `Cache Failure ACTIVE: ${reason}`);
    return { success: true, scenario: 'cache_failure', reason };
  }

  resolveCacheFailure() {
    this.faults.cache_failure.active = false;
    this.faults.cache_failure.injectedAt = null;
    cacheService.setAvailability(true);
    logger.info('fault-manager', 'Cache Failure RESOLVED: cache service available');
    return { success: true, scenario: 'cache_failure' };
  }

  // ================= 5. CIRCUIT BREAKER TRIP =================
  injectCircuitBreakerTrip(reason = 'Fault injection: simulated inventory dependency failures') {
    if (!this.isFaultInjectionAllowed()) {
      throw new Error('Fault injection forbidden in production environment');
    }

    this.faults.circuit_breaker_trip.active = true;
    this.faults.circuit_breaker_trip.injectedAt = new Date().toISOString();
    this.faults.circuit_breaker_trip.params.trippedState = 'OPEN';

    // Enable failure in underlying inventory service
    inventoryService.setSimulatedFailure(true, 'Underlying RPC database connection failure');
    // Trip the circuit breaker to OPEN
    inventoryCircuitBreaker.trip(reason);

    logger.error('fault-manager', `Circuit Breaker Trip ACTIVE: State is OPEN. Subsequent calls will be rejected.`);
    return {
      success: true,
      scenario: 'circuit_breaker_trip',
      breakerMetrics: inventoryCircuitBreaker.getMetrics()
    };
  }

  resolveCircuitBreakerTrip() {
    this.faults.circuit_breaker_trip.active = false;
    this.faults.circuit_breaker_trip.injectedAt = null;
    this.faults.circuit_breaker_trip.params.trippedState = 'CLOSED';

    // Restore underlying inventory service
    inventoryService.setSimulatedFailure(false);
    // Reset circuit breaker to CLOSED
    inventoryCircuitBreaker.reset();

    logger.info('fault-manager', 'Circuit Breaker Trip RESOLVED: reset to CLOSED');
    return {
      success: true,
      scenario: 'circuit_breaker_trip',
      breakerMetrics: inventoryCircuitBreaker.getMetrics()
    };
  }

  // ================= GLOBAL DISPATCH & RESET =================
  async inject(scenario, params = {}) {
    switch (scenario) {
      case 'db_exhaustion':
        return await this.injectDbExhaustion(params.safetyTimeoutSeconds || 60);
      case 'high_latency':
        return this.injectHighLatency(params.delayMs || 2000, params.targetEndpoints);
      case 'service_error_spike':
        return this.injectServiceErrorSpike(params.targetService, params.targetEndpoint, params.httpStatus);
      case 'cache_failure':
        return this.injectCacheFailure(params.reason);
      case 'circuit_breaker_trip':
        return this.injectCircuitBreakerTrip(params.reason);
      default:
        throw new Error(`Unknown fault scenario: "${scenario}". Available: db_exhaustion, high_latency, service_error_spike, cache_failure, circuit_breaker_trip`);
    }
  }

  disable(scenario) {
    switch (scenario) {
      case 'db_exhaustion':
        return this.resolveDbExhaustion();
      case 'high_latency':
        return this.resolveHighLatency();
      case 'service_error_spike':
        return this.resolveServiceErrorSpike();
      case 'cache_failure':
        return this.resolveCacheFailure();
      case 'circuit_breaker_trip':
        return this.resolveCircuitBreakerTrip();
      default:
        throw new Error(`Unknown fault scenario: "${scenario}"`);
    }
  }

  resetAll() {
    logger.info('fault-manager', 'Resetting ALL active fault scenarios to healthy state');
    this.resolveDbExhaustion();
    this.resolveHighLatency();
    this.resolveServiceErrorSpike();
    this.resolveCacheFailure();
    this.resolveCircuitBreakerTrip();
    return {
      success: true,
      message: 'All faults successfully resolved. Application restored to healthy baseline.',
      activeCount: 0
    };
  }
}

let faultManagerInstance = null;
function getFaultManager(pool) {
  if (!faultManagerInstance && pool) {
    faultManagerInstance = new FaultManager(pool);
  }
  return faultManagerInstance;
}

module.exports = {
  FaultManager,
  getFaultManager
};
