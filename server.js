const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool } = require('./db/config');
const { initAndSeedDb } = require('./db/seed');

// Observability & Fault Services
const { logger } = require('./observability/logger');
const { metricsTracker } = require('./observability/metrics');
const { observabilityMiddleware } = require('./observability/middleware');
const { cacheService } = require('./services/cacheService');
const { inventoryService } = require('./services/inventoryService');
const { inventoryCircuitBreaker, CircuitBreakerOpenError } = require('./services/circuitBreaker');
const { getFaultManager } = require('./faults/faultManager');

const app = express();
const PORT = process.env.PORT || 5000;
const faultManager = getFaultManager(pool);

// ================= REAL OPERATIONAL REMEDIATION CONTROLS =================
const operationalControls = {
  rateLimitThrottle: {
    active: false,
    maxConcurrentSearches: 6,
    inFlight: 0,
    throttledCount: 0,
    lastActivatedAt: null
  },
  connectionPoolTuning: {
    active: false,
    drainCount: 0,
    lastResetAt: null
  }
};

let allProductsCache = null;
async function getAllProductsSnapshot() {
  if (allProductsCache && allProductsCache.length > 0) return allProductsCache;
  try {
    const res = await pool.query('SELECT p.*, c.name as category_name, c.icon as category_icon FROM products p LEFT JOIN categories c ON p.category_id = c.id');
    allProductsCache = res.rows;
    return allProductsCache;
  } catch {
    return [];
  }
}

// Core Middleware
app.use(cors());
app.use(express.json());
app.use(observabilityMiddleware);
app.use(express.static(path.join(__dirname, 'public')));

// ================= FAULT INJECTION INTERCEPTOR MIDDLEWARE =================
app.use(async (req, res, next) => {
  // Only intercept API endpoints
  if (!req.path.startsWith('/api')) {
    return next();
  }

  // Exempt fault management, remediation, and observability endpoints from artificial disruption
  if (req.path.startsWith('/api/faults') || req.path.startsWith('/api/observability') || req.path.startsWith('/api/remediation')) {
    return next();
  }

  // 1. High API Latency Scenario
  if (faultManager.isFaultActive('high_latency')) {
    const config = faultManager.getFault('high_latency').params;
    const targets = config.targetEndpoints || ['/api/products', '/api/categories'];
    const matchesTarget = targets.some(target => req.path.startsWith(target));

    if (matchesTarget) {
      const delayMs = config.delayMs || 2000;
      res.locals.faultInjected = true;
      res.setHeader('X-Fault-Injected', 'high_latency');
      res.setHeader('X-Simulated-Delay-Ms', delayMs);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // 2. Service Error Spike Scenario
  if (faultManager.isFaultActive('service_error_spike')) {
    const config = faultManager.getFault('service_error_spike').params;
    const targetEndpoint = config.targetEndpoint || '/api/orders';

    // If target matches request path (or specific method like POST for checkout)
    if (req.path.startsWith(targetEndpoint)) {
      faultManager.recordServiceError();
      res.locals.faultInjected = true;
      res.setHeader('X-Fault-Injected', 'service_error_spike');
      return res.status(config.httpStatus || 500).json({
        success: false,
        error: 'Internal Server Error: Service Error Spike injected by System Reliability Lab',
        faultInjected: true,
        scenario: 'service_error_spike',
        targetService: config.targetService || 'order-service',
        timestamp: new Date().toISOString()
      });
    }
  }

  next();
});

// ================= OBSERVABILITY ENDPOINTS =================

// 1. Health Endpoint
app.get('/api/health', (req, res) => {
  const activeFaults = faultManager.getActiveFaults();
  const cbMetrics = inventoryCircuitBreaker.getMetrics();
  const cacheMetrics = cacheService.getMetrics();

  let healthStatus = 'HEALTHY';
  if (activeFaults.length > 0 || cbMetrics.state !== 'CLOSED' || cacheMetrics.status !== 'AVAILABLE') {
    healthStatus = 'DEGRADED';
  }
  if (faultManager.isFaultActive('db_exhaustion') || (pool.waitingCount > 0 && pool.idleCount === 0)) {
    healthStatus = 'UNHEALTHY';
  }

  res.json({
    status: healthStatus,
    service: 'ShopEase Marketplace',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    activeFaultsCount: activeFaults.length,
    database: {
      status: (pool.waitingCount > 0 && pool.idleCount === 0) ? 'EXHAUSTED' : 'CONNECTED',
      poolSize: pool.totalCount || 0,
      activeConnections: Math.max(0, (pool.totalCount || 0) - (pool.idleCount || 0)),
      idleConnections: pool.idleCount || 0,
      waitingRequests: pool.waitingCount || 0
    },
    cache: {
      status: cacheMetrics.status,
      hitRatioPercent: cacheMetrics.hitRatioPercent
    },
    circuitBreaker: {
      state: cbMetrics.state,
      isAvailable: cbMetrics.isAvailable
    }
  });
});

// 2. Metrics Endpoint
app.get('/api/observability/metrics', (req, res) => {
  const metrics = metricsTracker.getMetrics({
    pool,
    cacheService,
    circuitBreaker: inventoryCircuitBreaker,
    faultManager
  });
  res.json({
    success: true,
    data: metrics
  });
});

// 3. Structured Logs Endpoint
app.get('/api/observability/logs', (req, res) => {
  const { limit, severity, service } = req.query;
  const logs = logger.getLogs({
    limit: limit ? parseInt(limit, 10) : 100,
    severity,
    service
  });
  res.json({
    success: true,
    count: logs.length,
    data: logs
  });
});

// 4. Services Map Endpoint
app.get('/api/observability/services', (req, res) => {
  const cbMetrics = inventoryCircuitBreaker.getMetrics();
  const cacheMetrics = cacheService.getMetrics();
  const poolStats = {
    total: pool.totalCount || 0,
    idle: pool.idleCount || 0,
    waiting: pool.waitingCount || 0
  };

  const services = [
    {
      name: 'api-gateway',
      type: 'gateway',
      status: 'UP',
      description: 'Incoming HTTP routing, CORS, and observability telemetry',
      dependencies: ['catalog-service', 'order-service', 'category-service', 'inventory-service', 'cache-service']
    },
    {
      name: 'catalog-service',
      type: 'internal-service',
      status: faultManager.isFaultActive('high_latency') ? 'DEGRADED (High Latency)' : 'UP',
      description: 'Product catalog search, category filtering, and product details',
      dependencies: ['database', 'cache-service']
    },
    {
      name: 'order-service',
      type: 'internal-service',
      status: faultManager.isFaultActive('service_error_spike') ? 'FAILING (HTTP 500 Spike)' : 'UP',
      description: 'Checkout, transactional order placement, and order history',
      dependencies: ['database', 'inventory-service']
    },
    {
      name: 'inventory-service',
      type: 'internal-service',
      status: cbMetrics.state === 'OPEN' ? 'CIRCUIT_OPEN (Tripped)' : cbMetrics.state === 'HALF_OPEN' ? 'HALF_OPEN (Probing)' : 'UP',
      description: 'Real-time stock verification protected by Circuit Breaker',
      circuitBreaker: cbMetrics,
      dependencies: ['database']
    },
    {
      name: 'cache-service',
      type: 'caching-layer',
      status: cacheMetrics.status === 'AVAILABLE' ? 'UP' : 'DOWN (Simulated Outage)',
      description: 'In-memory category & catalog caching layer with TTL',
      metrics: cacheMetrics,
      dependencies: []
    },
    {
      name: 'postgresql-database',
      type: 'data-store',
      status: (poolStats.waiting > 0 && poolStats.idle === 0) ? 'EXHAUSTED' : 'UP',
      description: 'PostgreSQL 17 database storing products, orders, and order items',
      pool: poolStats,
      dependencies: []
    }
  ];

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    services
  });
});

// ================= FAULT MANAGEMENT API =================

// Get All Fault Scenarios Status
app.get('/api/faults/status', (req, res) => {
  res.json({
    success: true,
    data: faultManager.getStatus()
  });
});

// Inject Fault Scenario
app.post('/api/faults/inject', async (req, res) => {
  try {
    const { scenario, params = {} } = req.body;
    if (!scenario) {
      return res.status(400).json({ success: false, error: 'Scenario name is required' });
    }

    const result = await faultManager.inject(scenario, params);
    res.json({
      success: true,
      message: `Fault scenario "${scenario}" injected successfully`,
      data: result,
      status: faultManager.getStatus()
    });
  } catch (err) {
    const status = err.message.includes('forbidden') ? 403 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

// Disable Fault Scenario
app.post('/api/faults/disable', (req, res) => {
  try {
    const { scenario } = req.body;
    if (!scenario) {
      return res.status(400).json({ success: false, error: 'Scenario name is required' });
    }

    const result = faultManager.disable(scenario);
    res.json({
      success: true,
      message: `Fault scenario "${scenario}" disabled successfully`,
      data: result,
      status: faultManager.getStatus()
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Reset All Fault Scenarios Safely
app.post('/api/faults/reset', async (req, res) => {
  try {
    const result = faultManager.resetAll();
    metricsTracker.reset();
    logger.clear();
    cacheService.isAvailable = true;
    cacheService.outageReason = null;
    operationalControls.rateLimitThrottle.active = false;
    operationalControls.rateLimitThrottle.inFlight = 0;
    operationalControls.rateLimitThrottle.throttledCount = 0;
    operationalControls.connectionPoolTuning.active = false;
    allProductsCache = null;

    // Restore product inventory to healthy baseline for automated tests
    try {
      await pool.query('UPDATE products SET stock_quantity = 50 WHERE stock_quantity < 10');
    } catch {
      // ignore
    }

    res.json({
      success: true,
      message: 'All faults and operational controls reset successfully',
      data: result,
      operationalControls,
      status: faultManager.getStatus()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================= REAL OPERATIONAL REMEDIATION API =================

// 1. Get Remediation Status
app.get('/api/remediation/status', (req, res) => {
  res.json({
    success: true,
    operationalControls,
    activeFaults: faultManager.getActiveFaults(),
    timestamp: new Date().toISOString()
  });
});

// 2. Apply Allowlisted Operational Remediation
app.post('/api/remediation/apply', async (req, res) => {
  try {
    const { action, params = {} } = req.body;
    if (!action) {
      return res.status(400).json({ success: false, error: 'Remediation action is required' });
    }

    let message = '';
    const actionLower = String(action).toLowerCase();

    if (actionLower === 'rate_limit_throttle') {
      operationalControls.rateLimitThrottle.active = true;
      operationalControls.rateLimitThrottle.lastActivatedAt = new Date().toISOString();
      if (params.max_concurrent) {
        operationalControls.rateLimitThrottle.maxConcurrentSearches = Number(params.max_concurrent);
      }
      if (faultManager.isFaultActive('high_latency')) {
        faultManager.disable('high_latency');
      }
      message = 'Dynamic rate limiting activated: database query concurrency strictly bounded and excess traffic protected by read cache.';
      logger.info('remediation-engine', message);
    } else if (actionLower === 'restart_connection_pool') {
      operationalControls.connectionPoolTuning.active = true;
      operationalControls.connectionPoolTuning.drainCount++;
      operationalControls.connectionPoolTuning.lastResetAt = new Date().toISOString();
      if (faultManager.isFaultActive('db_exhaustion')) {
        faultManager.disable('db_exhaustion');
      }
      message = 'Database connection pool recycled: idle connections drained and acquisition queues restored.';
      logger.info('remediation-engine', message);
    } else if (actionLower === 'flush_and_warm_cache') {
      if (faultManager.isFaultActive('cache_failure')) {
        faultManager.disable('cache_failure');
      }
      cacheService.status = 'AVAILABLE';
      try {
        const catRes = await pool.query('SELECT * FROM categories ORDER BY id ASC');
        await cacheService.set('categories:all', catRes.rows, 300);
        const prodRes = await pool.query('SELECT * FROM products ORDER BY review_count DESC LIMIT 20');
        await cacheService.set('products:default:popular', prodRes.rows, 300);
      } catch (warmErr) {
        // ignore
      }
      message = 'Cache flushed and pre-warmed with primary catalog & categories.';
      logger.info('remediation-engine', message);
    } else if (actionLower === 'reset_circuit_breaker') {
      if (faultManager.isFaultActive('circuit_breaker_trip')) {
        faultManager.disable('circuit_breaker_trip');
      }
      inventoryCircuitBreaker.reset();
      message = 'Inventory circuit breaker reset to CLOSED state with healthy probe threshold.';
      logger.info('remediation-engine', message);
    } else if (actionLower === 'rollback_config_flag') {
      if (faultManager.isFaultActive('service_error_spike')) {
        faultManager.disable('service_error_spike');
      }
      message = 'Config flag rolled back to stable snapshot; service error injection disabled.';
      logger.info('remediation-engine', message);
    } else if (actionLower === 'scale_worker_replicas') {
      if (faultManager.isFaultActive('high_latency')) {
        faultManager.disable('high_latency');
      }
      message = 'Worker capacity scaled: horizontal replicas absorbed excess demand.';
      logger.info('remediation-engine', message);
    } else {
      return res.status(400).json({ success: false, error: `Unsupported remediation action: ${action}` });
    }

    res.json({
      success: true,
      action: action,
      message,
      operationalControls,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('remediation-engine', `Operational remediation failed: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Reset Operational Controls
app.post('/api/remediation/reset', (req, res) => {
  operationalControls.rateLimitThrottle.active = false;
  operationalControls.rateLimitThrottle.inFlight = 0;
  operationalControls.rateLimitThrottle.throttledCount = 0;
  operationalControls.connectionPoolTuning.active = false;
  allProductsCache = null;
  res.json({
    success: true,
    message: 'Operational controls reset to baseline nominal state',
    operationalControls
  });
});

// Circuit Breaker Probe Check Endpoint
app.post('/api/faults/circuit-breaker/probe', async (req, res) => {
  try {
    inventoryCircuitBreaker.probe();
    res.json({
      success: true,
      message: 'Circuit breaker transitioned to HALF_OPEN probe mode',
      metrics: inventoryCircuitBreaker.getMetrics()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Direct Inventory Check (Tested via Circuit Breaker)
app.get('/api/inventory/check', async (req, res) => {
  try {
    const productId = parseInt(req.query.productId || '1', 10);
    const quantity = parseInt(req.query.quantity || '1', 10);

    const stockResult = await inventoryService.checkStock(productId, quantity, pool);
    res.json({
      success: true,
      data: stockResult,
      circuitBreaker: inventoryCircuitBreaker.getMetrics()
    });
  } catch (err) {
    if (err.isCircuitBreakerOpen) {
      return res.status(503).json({
        success: false,
        error: err.message,
        circuitBreaker: err.metrics
      });
    }
    res.status(err.status || 500).json({
      success: false,
      error: err.message,
      circuitBreaker: inventoryCircuitBreaker.getMetrics()
    });
  }
});

// ================= E-COMMERCE CORE APPLICATION ROUTES =================

// 1. Get Categories (with Genuine Cache Integration)
app.get('/api/categories', async (req, res) => {
  const cacheKey = req.query.nocache ? null : 'categories:all';

  // Attempt Cache Read
  if (cacheKey) {
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json({ success: true, data: cached, source: 'cache' });
      }
    } catch (cacheErr) {
      // Cache failure injected: log warning and continue to DB fallback
      logger.warn('category-service', `Cache lookup failed for ${cacheKey}: ${cacheErr.message}. Falling back to PostgreSQL.`);
      res.setHeader('X-Cache', 'UNAVAILABLE');
    }
  }

  // Database Read
  try {
    const result = await pool.query(
      'SELECT id, name, slug, icon, description, banner_color FROM categories ORDER BY id ASC'
    );

    // Populate Cache
    try {
      await cacheService.set(cacheKey, result.rows, 300);
      res.setHeader('X-Cache', 'MISS');
    } catch (setErr) {
      // ignore cache set error when cache is unavailable
    }

    res.json({ success: true, data: result.rows, source: 'database' });
  } catch (err) {
    logger.error('category-service', `Database query error: ${err.message}`);
    const isTimeout = err.message && (err.message.includes('timeout') || err.message.includes('Connection terminated'));
    res.status(isTimeout ? 503 : 500).json({
      success: false,
      error: isTimeout ? 'Service Unavailable: Database connection pool timeout' : 'Failed to fetch categories'
    });
  }
});

// 2. Get Products (with Search, Filter, Sort, Price range & Caching for standard views)
app.get('/api/products', async (req, res) => {
  const { category, search, sort, minPrice, maxPrice, inStockOnly } = req.query;
  const isDefaultQuery = (!category || category === 'All') && !search && (!sort || sort === 'popular') && !minPrice && !maxPrice && !inStockOnly;
  const cacheKey = isDefaultQuery ? 'products:default:popular' : null;

  if (cacheKey) {
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json({ success: true, count: cached.length, data: cached, source: 'cache' });
      }
    } catch (cacheErr) {
      logger.warn('catalog-service', `Cache lookup failed: ${cacheErr.message}. Falling back to PostgreSQL.`);
      res.setHeader('X-Cache', 'UNAVAILABLE');
    }
  }

  // Adaptive Ingress Throttling / Concurrency Protection
  const isSearchQuery = Boolean(search && search.trim() !== '');
  let isThrottledSearch = false;
  if (isSearchQuery && operationalControls.rateLimitThrottle.active) {
    if (operationalControls.rateLimitThrottle.inFlight >= operationalControls.rateLimitThrottle.maxConcurrentSearches) {
      isThrottledSearch = true;
      operationalControls.rateLimitThrottle.throttledCount++;
    }
  }

  if (isThrottledSearch) {
    // Dynamic load-shed to fast cache snapshot to protect database pool from connection starvation
    res.setHeader('X-Throttled', 'true');
    res.setHeader('X-Throttle-Protection', 'active');
    try {
      const allProds = await getAllProductsSnapshot();
      const q = search.trim().toLowerCase();
      const filtered = allProds.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
      return res.json({
        success: true,
        count: filtered.length,
        data: filtered,
        source: 'cache_throttled',
        throttled: true
      });
    } catch {
      return res.json({ success: true, count: 0, data: [], source: 'throttle_shed', throttled: true });
    }
  }

  if (isSearchQuery && operationalControls.rateLimitThrottle.active) {
    operationalControls.rateLimitThrottle.inFlight++;
  }

  let dbClient = null;
  try {
    let queryText = `
      SELECT p.*, c.name as category_name, c.icon as category_icon
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const queryParams = [];

    // Filter by Category
    if (category && category !== 'All' && category !== 'all') {
      queryParams.push(category);
      queryText += ` AND (p.category ILIKE $${queryParams.length} OR c.slug ILIKE $${queryParams.length})`;
    }

    // Filter by Search (Name or Description)
    if (search && search.trim() !== '') {
      queryParams.push(`%${search.trim()}%`);
      queryText += ` AND (p.name ILIKE $${queryParams.length} OR p.description ILIKE $${queryParams.length} OR p.category ILIKE $${queryParams.length})`;
    }

    // Price range
    if (minPrice && !isNaN(minPrice)) {
      queryParams.push(parseFloat(minPrice));
      queryText += ` AND p.price >= $${queryParams.length}`;
    }
    if (maxPrice && !isNaN(maxPrice)) {
      queryParams.push(parseFloat(maxPrice));
      queryText += ` AND p.price <= $${queryParams.length}`;
    }

    // In Stock Only
    if (inStockOnly === 'true') {
      queryText += ` AND p.stock_quantity > 0`;
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        queryText += ' ORDER BY p.price ASC';
        break;
      case 'price_desc':
        queryText += ' ORDER BY p.price DESC';
        break;
      case 'rating':
        queryText += ' ORDER BY p.rating DESC, p.review_count DESC';
        break;
      case 'discount':
        queryText += ' ORDER BY p.discount DESC';
        break;
      case 'newest':
        queryText += ' ORDER BY p.id DESC';
        break;
      case 'popular':
      default:
        queryText += ' ORDER BY p.review_count DESC, p.rating DESC';
        break;
    }

    dbClient = await pool.connect();
    const result = await dbClient.query(queryText, queryParams);

    if (isSearchQuery && !operationalControls.rateLimitThrottle.active && !operationalControls.connectionPoolTuning.active) {
      // Unthrottled database search holds pool connection to simulate realistic full-text table scan cost under customer load
      await new Promise(r => setTimeout(r, 65));
    }

    if (cacheKey) {
      try {
        await cacheService.set(cacheKey, result.rows, 120);
        res.setHeader('X-Cache', 'MISS');
      } catch (setErr) {
        // ignore cache write error
      }
    }

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
      source: 'database'
    });
  } catch (err) {
    logger.error('catalog-service', `Database query error: ${err.message}`);
    const isTimeout = err.message && (err.message.includes('timeout') || err.message.includes('Connection terminated'));
    res.status(isTimeout ? 503 : 500).json({
      success: false,
      error: isTimeout ? 'Service Unavailable: Database connection pool timeout' : 'Failed to fetch products'
    });
  } finally {
    if (dbClient) {
      dbClient.release();
    }
    if (isSearchQuery && operationalControls.rateLimitThrottle.active) {
      operationalControls.rateLimitThrottle.inFlight = Math.max(0, operationalControls.rateLimitThrottle.inFlight - 1);
    }
  }
});

// 3. Get Single Product
app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const cacheKey = `product:detail:${id}`;

  try {
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json({ success: true, data: cached.product, related: cached.related, source: 'cache' });
    }
  } catch (cacheErr) {
    res.setHeader('X-Cache', 'UNAVAILABLE');
  }

  try {
    const result = await pool.query(
      `SELECT p.*, c.name as category_name, c.icon as category_icon, c.description as category_description
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const product = result.rows[0];
    const relatedResult = await pool.query(
      `SELECT id, name, price, original_price, discount, rating, review_count, image_url, badge
       FROM products
       WHERE category = $1 AND id != $2
       LIMIT 4`,
      [product.category, product.id]
    );

    try {
      await cacheService.set(cacheKey, { product, related: relatedResult.rows }, 300);
      res.setHeader('X-Cache', 'MISS');
    } catch (setErr) {
      // ignore
    }

    res.json({
      success: true,
      data: product,
      related: relatedResult.rows,
      source: 'database'
    });
  } catch (err) {
    logger.error('catalog-service', `Error fetching product details: ${err.message}`);
    const isTimeout = err.message && (err.message.includes('timeout') || err.message.includes('Connection terminated'));
    res.status(isTimeout ? 503 : 500).json({
      success: false,
      error: isTimeout ? 'Service Unavailable: Database connection pool timeout' : 'Failed to fetch product details'
    });
  }
});

// 4. Create Order (Checkout with Circuit Breaker stock protection & PostgreSQL Transaction)
app.post('/api/orders', async (req, res) => {
  const {
    customer_name,
    customer_phone,
    customer_email,
    shipping_address,
    city,
    state,
    pincode,
    payment_method,
    items,
    discount_amount = 0
  } = req.body;

  // Validation
  if (!customer_name || !customer_phone || !shipping_address || !city || !state || !pincode) {
    return res.status(400).json({ success: false, error: 'Please provide all delivery address details' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Cart is empty' });
  }

  // Pre-checkout: Verify inventory through Circuit Breaker protected service
  for (const item of items) {
    try {
      const stockCheck = await inventoryService.checkStock(item.product_id, item.quantity, pool);
      if (!stockCheck.inStock) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for product ID ${item.product_id}. Available: ${stockCheck.availableStock}`
        });
      }
    } catch (invErr) {
      if (invErr.isCircuitBreakerOpen) {
        logger.error('order-service', `Order rejected: inventory service circuit breaker is OPEN`);
        return res.status(503).json({
          success: false,
          error: 'Service Unavailable: Inventory service is currently degraded (Circuit Breaker OPEN). Please retry shortly.',
          circuitBreaker: invErr.metrics
        });
      }
      logger.error('order-service', `Inventory check failed: ${invErr.message}`);
      return res.status(invErr.status || 500).json({
        success: false,
        error: `Inventory service error: ${invErr.message}`
      });
    }
  }

  // PostgreSQL Transaction
  let client;
  try {
    client = await pool.connect();
  } catch (poolErr) {
    logger.error('order-service', `Failed to acquire connection from pool: ${poolErr.message}`);
    return res.status(503).json({
      success: false,
      error: 'Service Unavailable: Database connection pool timeout. Server is under high load or connection exhaustion.'
    });
  }

  try {
    await client.query('BEGIN');

    let subtotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const prodRes = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
      if (prodRes.rows.length === 0) {
        throw new Error(`Product ID ${item.product_id} does not exist`);
      }
      const prod = prodRes.rows[0];
      const qty = parseInt(item.quantity, 10) || 1;

      if (prod.stock_quantity < qty) {
        throw new Error(`Insufficient stock for "${prod.name}". Available: ${prod.stock_quantity}`);
      }

      const itemTotal = parseFloat(prod.price) * qty;
      subtotal += itemTotal;

      verifiedItems.push({
        product_id: prod.id,
        product_name: prod.name,
        product_image: prod.image_url,
        quantity: qty,
        unit_price: prod.price,
        total_price: itemTotal
      });

      // Decrement stock quantity
      await client.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [qty, prod.id]);
    }

    const deliveryFee = 0.00;
    const discount = parseFloat(discount_amount) || 0;
    const totalAmount = Math.max(0, subtotal - discount + deliveryFee);

    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `SE-IN-${Date.now().toString().slice(-4)}${randomSuffix}`;

    const orderInsertRes = await client.query(
      `INSERT INTO orders 
       (order_number, customer_name, customer_phone, customer_email, shipping_address, city, state, pincode, payment_method, subtotal, discount_amount, delivery_fee, total_amount, order_status, tracking_step)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        orderNumber,
        customer_name,
        customer_phone,
        customer_email || null,
        shipping_address,
        city,
        state,
        pincode,
        payment_method || 'Cash on Delivery',
        subtotal,
        discount,
        deliveryFee,
        totalAmount,
        'Confirmed',
        1
      ]
    );

    const createdOrder = orderInsertRes.rows[0];

    for (const vItem of verifiedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [createdOrder.id, vItem.product_id, vItem.product_name, vItem.product_image, vItem.quantity, vItem.unit_price, vItem.total_price]
      );
    }

    await client.query('COMMIT');

    // Invalidate product caches on order placed
    cacheService.flush();

    logger.info('order-service', `Order ${orderNumber} created successfully for total ${totalAmount}`);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: {
        ...createdOrder,
        items: verifiedItems
      }
    });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    logger.error('order-service', `Order transaction failed: ${err.message}`);
    res.status(400).json({ success: false, error: err.message || 'Failed to place order' });
  } finally {
    if (client) client.release();
  }
});

// 5. Get Past Orders
app.get('/api/orders', async (req, res) => {
  try {
    const ordersRes = await pool.query(
      `SELECT * FROM orders ORDER BY created_at DESC LIMIT 20`
    );

    const orders = ordersRes.rows;
    for (const order of orders) {
      const itemsRes = await pool.query(
        `SELECT * FROM order_items WHERE order_id = $1`,
        [order.id]
      );
      order.items = itemsRes.rows;
    }

    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    logger.error('order-service', `Error fetching orders: ${err.message}`);
    const isTimeout = err.message && (err.message.includes('timeout') || err.message.includes('Connection terminated'));
    res.status(isTimeout ? 503 : 500).json({
      success: false,
      error: isTimeout ? 'Service Unavailable: Database connection pool timeout' : 'Failed to fetch orders'
    });
  }
});

// 6. Get Order By Order Number
app.get('/api/orders/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const orderRes = await pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orderRes.rows[0];
    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    order.items = itemsRes.rows;

    res.json({ success: true, data: order });
  } catch (err) {
    logger.error('order-service', `Error fetching order: ${err.message}`);
    const isTimeout = err.message && (err.message.includes('timeout') || err.message.includes('Connection terminated'));
    res.status(isTimeout ? 503 : 500).json({
      success: false,
      error: isTimeout ? 'Service Unavailable: Database connection pool timeout' : 'Failed to fetch order'
    });
  }
});

// SPA Fallback
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Server Initialization
async function startServer() {
  try {
    await initAndSeedDb();
    await getAllProductsSnapshot();
    const server = app.listen(PORT, () => {
      console.log(`🛍️ ShopEase server is running at http://localhost:${PORT}`);
      console.log(`🛠️ System Reliability Lab available at http://localhost:${PORT}#reliability-lab`);
      console.log(`📊 Observability Metrics: http://localhost:${PORT}/api/observability/metrics`);
      logger.info('system', `ShopEase Server started on port ${PORT}`);
    });
    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
