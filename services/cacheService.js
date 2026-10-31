// ShopEase Cache Service with Measurable Hits/Misses & Outage Simulation
const { logger } = require('../observability/logger');

class CacheService {
  constructor(defaultTtlSeconds = 300) {
    this.defaultTtlSeconds = defaultTtlSeconds;
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      sets: 0
    };
    this.isAvailable = true; // Controlled state: true = Healthy, false = Simulated Outage
    this.outageReason = null;
  }

  // Set outage state (for fault injection)
  setAvailability(available, reason = null) {
    this.isAvailable = available;
    this.outageReason = available ? null : (reason || 'Simulated Cache Cluster Outage');
    if (!available) {
      logger.error('cache-service', `Cache cluster entered UNAVAILABLE state: ${this.outageReason}`);
    } else {
      logger.info('cache-service', 'Cache cluster restored to AVAILABLE state');
    }
  }

  async get(key) {
    if (!this.isAvailable) {
      this.stats.errors++;
      const err = new Error(`Cache Unavailable: ${this.outageReason}`);
      err.isCacheError = true;
      logger.warn('cache-service', `Cache GET rejected for key "${key}": ${this.outageReason}`);
      throw err;
    }

    const item = this.store.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value;
  }

  async set(key, value, ttlSeconds = this.defaultTtlSeconds) {
    if (!this.isAvailable) {
      this.stats.errors++;
      const err = new Error(`Cache Unavailable: ${this.outageReason}`);
      err.isCacheError = true;
      logger.warn('cache-service', `Cache SET rejected for key "${key}": ${this.outageReason}`);
      throw err;
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
    this.stats.sets++;
    return true;
  }

  async delete(key) {
    return this.store.delete(key);
  }

  flush() {
    this.store.clear();
  }

  getMetrics() {
    const totalLookups = this.stats.hits + this.stats.misses;
    const hitRatio = totalLookups > 0 ? Number(((this.stats.hits / totalLookups) * 100).toFixed(2)) : 0;

    return {
      status: this.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
      outageReason: this.outageReason,
      hits: this.stats.hits,
      misses: this.stats.misses,
      totalLookups: totalLookups,
      hitRatioPercent: hitRatio,
      errors: this.stats.errors,
      keysCount: this.store.size,
      ttlDefaultSeconds: this.defaultTtlSeconds
    };
  }
}

const cacheService = new CacheService();
module.exports = { cacheService, CacheService };
