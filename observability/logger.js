// ShopEase Structured JSON Logger with PII Sanitization & In-Memory Ring Buffer

class Logger {
  constructor(maxBuffer = 300) {
    this.maxBuffer = maxBuffer;
    this.logBuffer = [];
  }

  // PII Sanitizer: strips/masks sensitive customer and security data
  sanitize(data) {
    if (!data) return data;
    if (typeof data === 'string') {
      return data
        .replace(/(\b\d{6,16}\b)/g, (match) => match.length >= 10 ? '******' + match.slice(-4) : match)
        .replace(/([a-zA-Z0-9_\.-]+)@([\da-zA-Z\.-]+)\.([a-z\.]{2,6})/g, '$1[REDACTED]@domain.com')
        .replace(/(password|secret|token|apiKey)=[^& ]+/gi, '$1=[REDACTED]');
    }

    if (typeof data === 'object') {
      const sanitized = Array.isArray(data) ? [] : {};
      for (const [key, val] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        if (['password', 'secret', 'token', 'apikey', 'card', 'cvv', 'card_number'].includes(lowerKey)) {
          sanitized[key] = '[REDACTED]';
        } else if (['customer_phone', 'phone', 'mobile'].includes(lowerKey)) {
          sanitized[key] = typeof val === 'string' && val.length >= 4 ? '******' + val.slice(-4) : '[REDACTED]';
        } else if (['shipping_address', 'address'].includes(lowerKey)) {
          sanitized[key] = '[REDACTED_ADDRESS]';
        } else if (['customer_email', 'email'].includes(lowerKey)) {
          sanitized[key] = typeof val === 'string' && val.includes('@') 
            ? val.split('@')[0].slice(0, 2) + '***@' + val.split('@')[1] 
            : '[REDACTED_EMAIL]';
        } else if (typeof val === 'object' && val !== null) {
          sanitized[key] = this.sanitize(val);
        } else {
          sanitized[key] = val;
        }
      }
      return sanitized;
    }
    return data;
  }

  log(severity, service, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      service: service || 'shopease-core',
      severity: severity.toUpperCase(),
      message: typeof message === 'string' ? this.sanitize(message) : message,
      endpoint: meta.endpoint || null,
      status: meta.status || null,
      durationMs: meta.durationMs !== undefined ? Number(meta.durationMs.toFixed(2)) : null,
      metadata: this.sanitize(meta.extra || {})
    };

    // Keep ring buffer at maxBuffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBuffer) {
      this.logBuffer.shift();
    }

    // Print to stdout in development/test
    if (process.env.NODE_ENV !== 'test') {
      const color = severity === 'ERROR' ? '\x1b[31m' : severity === 'WARN' ? '\x1b[33m' : '\x1b[36m';
      console.log(`${color}[${entry.severity}]\x1b[0m ${entry.timestamp} [${entry.service}] ${entry.message}`);
    }

    return entry;
  }

  info(service, message, meta) {
    return this.log('INFO', service, message, meta);
  }

  warn(service, message, meta) {
    return this.log('WARN', service, message, meta);
  }

  error(service, message, meta) {
    return this.log('ERROR', service, message, meta);
  }

  debug(service, message, meta) {
    return this.log('DEBUG', service, message, meta);
  }

  getLogs({ limit = 100, severity, service } = {}) {
    let result = [...this.logBuffer];
    if (severity) {
      result = result.filter(l => l.severity.toLowerCase() === severity.toLowerCase());
    }
    if (service) {
      result = result.filter(l => l.service.toLowerCase().includes(service.toLowerCase()));
    }
    return result.slice(-Math.min(limit, this.maxBuffer)).reverse();
  }

  clear() {
    this.logBuffer = [];
  }
}

const logger = new Logger();
module.exports = { logger, Logger };
