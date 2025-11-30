import counterService from '../services/counter.js';
import queue from '../services/queue.js';

/**
 * Reset all counters to value 1
 * Uses the queue to prevent race conditions with increment operations
 */
async function resetCounters() {
  try {
    console.log(`[Cron] Starting counter reset job at ${new Date().toISOString()}`);
    
    // Get all unique tenant IDs
    const tenantIds = await counterService.getAllTenantIds();
    console.log(`[Cron] Found ${tenantIds.length} tenants to reset`);
    
    // Use a flag to ensure reset only executes once
    let resetExecuted = false;
    let resetCount = 0;
    
    // Queue the reset operation for each tenant to prevent race conditions
    // This ensures no increment operations happen during the reset for any tenant
    const resetPromises = tenantIds.map(async (tenantId) => {
      return queue.enqueue(tenantId, async () => {
        // Only execute the reset once, but queue it for all tenants to block increments
        if (!resetExecuted) {
          resetExecuted = true;
          resetCount = await counterService.resetAllCounters();
        }
        return resetCount;
      });
    });
    
    // Wait for all tenant queues to process the reset
    await Promise.all(resetPromises);
    
    console.log(`[Cron] Successfully reset ${resetCount} counters to value 1`);
  } catch (error) {
    console.error(`[Cron] Error resetting counters: ${error.message}`);
  }
}

export default resetCounters
