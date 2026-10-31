// ShopEase Observability Tracking Middleware
const { metricsTracker } = require('./metrics');
const { logger } = require('./logger');

function observabilityMiddleware(req, res, next) {
  const startHrTime = process.hrtime();

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const durationMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;

    // Only record and log API requests to avoid polluting metrics with static files
    if (req.path.startsWith('/api')) {
      const status = res.statusCode;

      metricsTracker.recordRequest({
        method: req.method,
        path: req.path,
        status: status,
        durationMs: durationMs
      });

      // Determine severity
      let severity = 'INFO';
      if (status >= 500) severity = 'ERROR';
      else if (status >= 400) severity = 'WARN';

      // Determine service from path
      let service = 'api-gateway';
      if (req.path.includes('/categories')) service = 'category-service';
      else if (req.path.includes('/products')) service = 'catalog-service';
      else if (req.path.includes('/orders')) service = 'order-service';
      else if (req.path.includes('/observability')) service = 'observability-service';
      else if (req.path.includes('/faults')) service = 'fault-manager';

      logger.log(severity, service, `${req.method} ${req.originalUrl || req.path} -> ${status} (${durationMs.toFixed(1)}ms)`, {
        endpoint: req.path,
        status: status,
        durationMs: durationMs,
        extra: {
          method: req.method,
          query: req.query,
          faultInjected: res.locals && res.locals.faultInjected ? true : false
        }
      });
    }
  });

  next();
}

module.exports = { observabilityMiddleware };
