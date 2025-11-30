/**
 * In-memory queue service to serialize counter increment operations per tenant
 * This prevents race conditions by ensuring operations are processed sequentially
 */
class Queue {
  constructor() {
    // Map of tenantId -> queue of operations
    this.queues = new Map();
    // Track if a queue is currently being processed
    this.processing = new Set();
  }

  /**
   * Enqueue an operation for a specific tenant
   * Operations for the same tenant will be processed sequentially
   * @param {string} tenantId - The tenant ID
   * @param {Function} operation - Async function to execute
   * @returns {Promise} Promise that resolves with the operation result
   */
  async enqueue(tenantId, operation) {
    // Get or create queue for this tenant
    if (!this.queues.has(tenantId)) {
      this.queues.set(tenantId, []);
    }

    // Add operation to queue
    return new Promise((resolve, reject) => {
      this.queues.get(tenantId).push({ operation, resolve, reject });
      
      // Start processing if not already processing
      if (!this.processing.has(tenantId)) {
        this.processQueue(tenantId);
      }
    });
  }

  /**
   * Process all queued operations for a tenant sequentially
   * @param {string} tenantId - The tenant ID
   */
  async processQueue(tenantId) {
    this.processing.add(tenantId);
    const queue = this.queues.get(tenantId);
    
    while (queue.length > 0) {
      const { operation, resolve, reject } = queue.shift();
      
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    // Remove processing flag and empty queue
    this.processing.delete(tenantId);
    if (queue.length === 0) {
      this.queues.delete(tenantId);
    }
  }
}

export default new Queue();

