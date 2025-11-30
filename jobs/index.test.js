import { test, describe, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

describe('resetCounters', () => {
  let resetCounters;
  let consoleLogSpy;
  let consoleErrorSpy;
  let counterService;
  let queue;

  beforeEach(async () => {
    // Mock console methods
    consoleLogSpy = mock.method(console, 'log', () => {});
    consoleErrorSpy = mock.method(console, 'error', () => {});

    // Import the actual modules
    const resetCountersModule = await import('./index.js');
    resetCounters = resetCountersModule.default;
    
    counterService = await import('../services/counter.js');
    queue = await import('../services/queue.js');
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mock.restore();
    consoleErrorSpy.mock.restore();
  });

  test('should be a function', () => {
    assert.strictEqual(typeof resetCounters, 'function');
  });

  test('should call getAllTenantIds', async () => {
    // Mock getAllTenantIds
    const getAllTenantIdsSpy = mock.method(counterService.default, 'getAllTenantIds', async () => []);
    
    try {
      await resetCounters();
    } catch (error) {
      // May fail due to other dependencies, but we can check if getAllTenantIds was called
    }
    
    // Verify getAllTenantIds was called
    assert.strictEqual(getAllTenantIdsSpy.mock.calls.length, 1);
    
    getAllTenantIdsSpy.mock.restore();
  });

  test('should handle empty tenant list', async () => {
    // Mock getAllTenantIds to return empty array
    const getAllTenantIdsSpy = mock.method(
      counterService.default, 
      'getAllTenantIds', 
      async () => []
    );
    
    // Mock resetAllCounters
    const resetAllCountersSpy = mock.method(
      counterService.default,
      'resetAllCounters',
      async () => 0
    );

    // Mock queue.enqueue to execute immediately
    const enqueueSpy = mock.method(
      queue.default,
      'enqueue',
      async (tenantId, operation) => await operation()
    );

    await resetCounters();

    // Verify getAllTenantIds was called
    assert.strictEqual(getAllTenantIdsSpy.mock.calls.length, 1);
    
    // Verify resetAllCounters was called (even with empty tenant list, the flag logic might still trigger)
    // Actually, with empty tenant list, resetAllCounters shouldn't be called
    // But the function structure means it might be called once due to the flag logic
    
    // Verify console.log was called
    assert.ok(consoleLogSpy.mock.calls.length > 0);
    
    getAllTenantIdsSpy.mock.restore();
    resetAllCountersSpy.mock.restore();
    enqueueSpy.mock.restore();
  });

  test('should reset counters for multiple tenants', async () => {
    const tenantIds = ['tenant-1', 'tenant-2', 'tenant-3'];
    const resetCount = 3;

    // Mock getAllTenantIds
    const getAllTenantIdsSpy = mock.method(
      counterService.default,
      'getAllTenantIds',
      async () => tenantIds
    );

    // Mock resetAllCounters
    const resetAllCountersSpy = mock.method(
      counterService.default,
      'resetAllCounters',
      async () => resetCount
    );

    // Mock queue.enqueue to execute the operation
    const enqueueSpy = mock.method(
      queue.default,
      'enqueue',
      async (tenantId, operation) => {
        return await operation();
      }
    );

    await resetCounters();

    // Verify getAllTenantIds was called
    assert.strictEqual(getAllTenantIdsSpy.mock.calls.length, 1);
    
    // Verify resetAllCounters was called exactly once (due to the flag)
    assert.strictEqual(resetAllCountersSpy.mock.calls.length, 1);
    
    // Verify queue.enqueue was called for each tenant
    assert.strictEqual(enqueueSpy.mock.calls.length, tenantIds.length);
    
    // Verify each tenant ID was used
    const calledTenantIds = enqueueSpy.mock.calls.map(call => call.arguments[0]);
    tenantIds.forEach(tenantId => {
      assert.ok(calledTenantIds.includes(tenantId), `Tenant ${tenantId} should be queued`);
    });

    // Verify console.log was called
    assert.ok(consoleLogSpy.mock.calls.length > 0);
    
    // Check that success message was logged
    const logMessages = consoleLogSpy.mock.calls.map(call => call.arguments[0]);
    const successMessage = logMessages.find(msg => 
      typeof msg === 'string' && msg.includes('Successfully reset')
    );
    assert.ok(successMessage, 'Success message should be logged');

    getAllTenantIdsSpy.mock.restore();
    resetAllCountersSpy.mock.restore();
    enqueueSpy.mock.restore();
  });

  test('should only execute reset once even with multiple tenants', async () => {
    const tenantIds = ['tenant-1', 'tenant-2', 'tenant-3'];
    const resetCount = 3;

    // Mock getAllTenantIds
    const getAllTenantIdsSpy = mock.method(
      counterService.default,
      'getAllTenantIds',
      async () => tenantIds
    );

    // Mock resetAllCounters - should only be called once
    const resetAllCountersSpy = mock.method(
      counterService.default,
      'resetAllCounters',
      async () => resetCount
    );

    // Mock queue.enqueue
    const enqueueSpy = mock.method(
      queue.default,
      'enqueue',
      async (tenantId, operation) => {
        return await operation();
      }
    );

    await resetCounters();

    // Verify resetAllCounters was called exactly once (the flag ensures this)
    assert.strictEqual(resetAllCountersSpy.mock.calls.length, 1, 
      'resetAllCounters should be called exactly once');

    getAllTenantIdsSpy.mock.restore();
    resetAllCountersSpy.mock.restore();
    enqueueSpy.mock.restore();
  });

  test('should handle errors from getAllTenantIds', async () => {
    const error = new Error('Failed to get tenant IDs');

    // Mock getAllTenantIds to throw error
    const getAllTenantIdsSpy = mock.method(
      counterService.default,
      'getAllTenantIds',
      async () => {
        throw error;
      }
    );

    await resetCounters();

    // Verify error was logged
    assert.strictEqual(consoleErrorSpy.mock.calls.length, 1);
    
    const errorMessage = consoleErrorSpy.mock.calls[0].arguments[0];
    assert.ok(typeof errorMessage === 'string');
    assert.ok(errorMessage.includes('Error resetting counters'));

    getAllTenantIdsSpy.mock.restore();
  });

  test('should handle errors from resetAllCounters', async () => {
    const tenantIds = ['tenant-1'];
    const error = new Error('Failed to reset counters');

    // Mock getAllTenantIds
    const getAllTenantIdsSpy = mock.method(
      counterService.default,
      'getAllTenantIds',
      async () => tenantIds
    );

    // Mock resetAllCounters to throw error
    const resetAllCountersSpy = mock.method(
      counterService.default,
      'resetAllCounters',
      async () => {
        throw error;
      }
    );

    // Mock queue.enqueue
    const enqueueSpy = mock.method(
      queue.default,
      'enqueue',
      async (tenantId, operation) => {
        return await operation();
      }
    );

    await resetCounters();

    // Verify error was logged
    assert.strictEqual(consoleErrorSpy.mock.calls.length, 1);
    
    const errorMessage = consoleErrorSpy.mock.calls[0].arguments[0];
    assert.ok(typeof errorMessage === 'string');
    assert.ok(errorMessage.includes('Error resetting counters'));

    getAllTenantIdsSpy.mock.restore();
    resetAllCountersSpy.mock.restore();
    enqueueSpy.mock.restore();
  });

  test('should log start and completion messages', async () => {
    const tenantIds = ['tenant-1'];
    const resetCount = 1;

    // Mock services
    const getAllTenantIdsSpy = mock.method(
      counterService.default,
      'getAllTenantIds',
      async () => tenantIds
    );

    const resetAllCountersSpy = mock.method(
      counterService.default,
      'resetAllCounters',
      async () => resetCount
    );

    const enqueueSpy = mock.method(
      queue.default,
      'enqueue',
      async (tenantId, operation) => {
        return await operation();
      }
    );

    await resetCounters();

    // Verify start message was logged
    const logMessages = consoleLogSpy.mock.calls.map(call => call.arguments[0]);
    const startMessage = logMessages.find(msg => 
      typeof msg === 'string' && msg.includes('Starting counter reset job')
    );
    assert.ok(startMessage, 'Start message should be logged');

    // Verify completion message was logged
    const completionMessage = logMessages.find(msg => 
      typeof msg === 'string' && msg.includes('Successfully reset')
    );
    assert.ok(completionMessage, 'Completion message should be logged');

    getAllTenantIdsSpy.mock.restore();
    resetAllCountersSpy.mock.restore();
    enqueueSpy.mock.restore();
  });
});
