// ShopEase Inventory Service wrapped by Circuit Breaker
const { inventoryCircuitBreaker } = require('./circuitBreaker');
const { logger } = require('../observability/logger');

class InventoryService {
  constructor() {
    this.simulatedFailure = false;
    this.failureReason = null;
  }

  setSimulatedFailure(failing, reason = 'Inventory downstream RPC failure') {
    this.simulatedFailure = failing;
    this.failureReason = failing ? reason : null;
    if (failing) {
      logger.warn('inventory-service', `Inventory service simulated failure enabled: ${reason}`);
    } else {
      logger.info('inventory-service', 'Inventory service normal operation restored');
    }
  }

  // Raw action that can fail
  async _rawCheckStock(productId, quantity, pool) {
    if (this.simulatedFailure) {
      const err = new Error(`Inventory Service Downstream Failure: ${this.failureReason}`);
      err.status = 503;
      err.service = 'inventory-service';
      throw err;
    }

    if (!pool) {
      return { inStock: true, available: 50 };
    }

    const res = await pool.query('SELECT id, name, stock_quantity FROM products WHERE id = $1', [productId]);
    if (res.rows.length === 0) {
      const err = new Error(`Product ${productId} not found in inventory`);
      err.status = 404;
      throw err;
    }

    const product = res.rows[0];
    const available = product.stock_quantity;
    const inStock = available >= quantity;

    return {
      productId: product.id,
      productName: product.name,
      requestedQuantity: quantity,
      availableStock: available,
      inStock: inStock
    };
  }

  // Public method executed through Circuit Breaker
  async checkStock(productId, quantity = 1, pool) {
    return inventoryCircuitBreaker.execute(async () => {
      return this._rawCheckStock(productId, quantity, pool);
    });
  }

  getMetrics() {
    return {
      simulatedFailure: this.simulatedFailure,
      failureReason: this.failureReason,
      circuitBreaker: inventoryCircuitBreaker.getMetrics()
    };
  }
}

const inventoryService = new InventoryService();
module.exports = { inventoryService, InventoryService };
