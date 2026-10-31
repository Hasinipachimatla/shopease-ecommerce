// ShopEase Real 3-State Circuit Breaker (CLOSED -> OPEN -> HALF_OPEN)
const { logger } = require('../observability/logger');

class CircuitBreakerOpenError extends Error {
  constructor(message, metrics) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.isCircuitBreakerOpen = true;
    this.status = 503;
    this.metrics = metrics;
  }
}

class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'inventory-service';
    this.failureThreshold = options.failureThreshold || 3; // consecutive failures to trip
    this.resetTimeout = options.resetTimeout || 5000;       // ms to wait before probing (HALF_OPEN)
    this.successThreshold = options.successThreshold || 2; // consecutive successes in HALF_OPEN to close

    this.state = 'CLOSED'; // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.lastStateChange = new Date().toISOString();
    this.totalTrips = 0;
    this.totalCalls = 0;
    this.totalRejections = 0;
  }

  transitionTo(newState, reason = '') {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = new Date().toISOString();

    if (newState === 'OPEN') {
      this.totalTrips++;
      this.consecutiveSuccesses = 0;
      logger.error('circuit-breaker', `[${this.name}] Circuit tripped: CLOSED -> OPEN. Reason: ${reason}`, {
        extra: { failureCount: this.consecutiveFailures, resetTimeoutMs: this.resetTimeout }
      });
    } else if (newState === 'HALF_OPEN') {
      logger.warn('circuit-breaker', `[${this.name}] Circuit reset timeout elapsed: OPEN -> HALF_OPEN (Trial probe mode)`);
    } else if (newState === 'CLOSED') {
      this.consecutiveFailures = 0;
      this.consecutiveSuccesses = 0;
      logger.info('circuit-breaker', `[${this.name}] Circuit recovered: ${oldState} -> CLOSED (Healthy)`);
    }
  }

  // Check state before executing action
  checkState() {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - (this.lastFailureTime || 0);
      if (elapsed >= this.resetTimeout) {
        this.transitionTo('HALF_OPEN', `Reset timeout (${this.resetTimeout}ms) elapsed`);
      }
    }
  }

  async execute(actionFn, fallbackFn = null) {
    this.totalCalls++;
    this.checkState();

    if (this.state === 'OPEN') {
      this.totalRejections++;
      const remainingMs = Math.max(0, this.resetTimeout - (Date.now() - (this.lastFailureTime || 0)));
      const err = new CircuitBreakerOpenError(
        `Service "${this.name}" unavailable: Circuit breaker is OPEN. Fast-failing request. Retry in ${Math.ceil(remainingMs / 1000)}s.`,
        this.getMetrics()
      );

      if (fallbackFn) {
        return fallbackFn(err);
      }
      throw err;
    }

    try {
      const result = await actionFn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      if (fallbackFn) {
        return fallbackFn(err);
      }
      throw err;
    }
  }

  onSuccess() {
    this.lastSuccessTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.successThreshold) {
        this.transitionTo('CLOSED', `Consecutive probe successes reached threshold (${this.successThreshold})`);
      }
    } else if (this.state === 'CLOSED') {
      this.consecutiveFailures = 0;
    }
  }

  onFailure(err) {
    this.lastFailureTime = Date.now();
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;

    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN', `Probe request failed during HALF_OPEN: ${err.message}`);
    } else if (this.state === 'CLOSED') {
      if (this.consecutiveFailures >= this.failureThreshold) {
        this.transitionTo('OPEN', `Consecutive failures (${this.consecutiveFailures}) >= threshold (${this.failureThreshold}): ${err.message}`);
      }
    }
  }

  // Manual trip for fault injection
  trip(reason = 'Fault injection: simulated repeated dependency failures') {
    this.consecutiveFailures = this.failureThreshold;
    this.lastFailureTime = Date.now();
    this.transitionTo('OPEN', reason);
  }

  // Force transition to HALF_OPEN (for testing)
  probe() {
    this.transitionTo('HALF_OPEN', 'Manual or timeout probe trigger');
  }

  // Reset to CLOSED
  reset() {
    this.transitionTo('CLOSED', 'Manual or fault resolved reset');
  }

  getMetrics() {
    const remainingResetMs = this.state === 'OPEN'
      ? Math.max(0, this.resetTimeout - (Date.now() - (this.lastFailureTime || 0)))
      : 0;

    return {
      name: this.name,
      state: this.state, // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
      failureCount: this.consecutiveFailures,
      failureThreshold: this.failureThreshold,
      successCount: this.consecutiveSuccesses,
      successThreshold: this.successThreshold,
      resetTimeoutMs: this.resetTimeout,
      remainingResetMs: remainingResetMs,
      totalCalls: this.totalCalls,
      totalRejections: this.totalRejections,
      totalTrips: this.totalTrips,
      lastStateChange: this.lastStateChange,
      isAvailable: this.state !== 'OPEN'
    };
  }
}

const inventoryCircuitBreaker = new CircuitBreaker({
  name: 'inventory-service',
  failureThreshold: 3,
  resetTimeout: 5000,
  successThreshold: 2
});

module.exports = {
  CircuitBreaker,
  CircuitBreakerOpenError,
  inventoryCircuitBreaker
};
