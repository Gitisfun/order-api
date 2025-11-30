import { test, describe } from 'node:test';
import assert from 'node:assert';
import queue from './queue.js';

describe('Queue', () => {
  test('should process a single operation', async () => {
    const result = await queue.enqueue('tenant-1', async () => {
      return 'test-result';
    });

    assert.strictEqual(result, 'test-result');
  });

  test('should process operations sequentially for the same tenant', async () => {
    const results = [];
    const order = [];

    // Enqueue multiple operations for the same tenant
    const promise1 = queue.enqueue('tenant-1', async () => {
      order.push(1);
      await new Promise(resolve => setTimeout(resolve, 50));
      results.push('first');
      return 'first';
    });

    const promise2 = queue.enqueue('tenant-1', async () => {
      order.push(2);
      await new Promise(resolve => setTimeout(resolve, 10));
      results.push('second');
      return 'second';
    });

    const promise3 = queue.enqueue('tenant-1', async () => {
      order.push(3);
      results.push('third');
      return 'third';
    });

    const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

    // Verify results
    assert.strictEqual(result1, 'first');
    assert.strictEqual(result2, 'second');
    assert.strictEqual(result3, 'third');

    // Verify sequential processing (order array should be [1, 2, 3])
    assert.deepStrictEqual(order, [1, 2, 3]);
    assert.deepStrictEqual(results, ['first', 'second', 'third']);
  });

  test('should process operations in parallel for different tenants', async () => {
    const startTime = Date.now();
    const results = [];

    // Enqueue operations for different tenants (should run in parallel)
    const promise1 = queue.enqueue('tenant-1', async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      results.push('tenant-1');
      return 'tenant-1';
    });

    const promise2 = queue.enqueue('tenant-2', async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      results.push('tenant-2');
      return 'tenant-2';
    });

    const promise3 = queue.enqueue('tenant-3', async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      results.push('tenant-3');
      return 'tenant-3';
    });

    await Promise.all([promise1, promise2, promise3]);
    const duration = Date.now() - startTime;

    // Should complete in ~50ms (parallel) not ~150ms (sequential)
    assert.ok(duration < 100, `Expected parallel execution (<100ms), got ${duration}ms`);
    assert.strictEqual(results.length, 3);
  });

  test('should handle errors in operations', async () => {
    await assert.rejects(
      async () => {
        await queue.enqueue('tenant-1', async () => {
          throw new Error('Test error');
        });
      },
      {
        name: 'Error',
        message: 'Test error'
      }
    );
  });

  test('should handle errors without affecting other operations', async () => {
    const results = [];

    const promise1 = queue.enqueue('tenant-1', async () => {
      results.push('first');
      return 'first';
    });

    const promise2 = queue.enqueue('tenant-1', async () => {
      throw new Error('Second operation failed');
    });

    const promise3 = queue.enqueue('tenant-1', async () => {
      results.push('third');
      return 'third';
    });

    // First should succeed
    await assert.doesNotReject(async () => {
      const result = await promise1;
      assert.strictEqual(result, 'first');
    });

    // Second should fail
    await assert.rejects(
      async () => await promise2,
      {
        name: 'Error',
        message: 'Second operation failed'
      }
    );

    // Third should still succeed (sequential processing continues)
    await assert.doesNotReject(async () => {
      const result = await promise3;
      assert.strictEqual(result, 'third');
    });

    assert.deepStrictEqual(results, ['first', 'third']);
  });

  test('should clean up queue after processing', async () => {
    const tenantId = 'tenant-cleanup';

    // Process an operation
    await queue.enqueue(tenantId, async () => {
      return 'done';
    });

    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 10));

    // Queue should be cleaned up (we can't directly access internal state,
    // but we can verify by processing another operation - it should work fine)
    const result = await queue.enqueue(tenantId, async () => {
      return 'done-again';
    });

    assert.strictEqual(result, 'done-again');
  });

  test('should handle async operations that return values', async () => {
    const result = await queue.enqueue('tenant-1', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return { data: 'test', count: 42 };
    });

    assert.deepStrictEqual(result, { data: 'test', count: 42 });
  });

  test('should handle operations that return null or undefined', async () => {
    const result1 = await queue.enqueue('tenant-1', async () => {
      return null;
    });

    const result2 = await queue.enqueue('tenant-1', async () => {
      return undefined;
    });

    assert.strictEqual(result1, null);
    assert.strictEqual(result2, undefined);
  });

  test('should process multiple sequential batches for same tenant', async () => {
    const results = [];

    // First batch
    await queue.enqueue('tenant-1', async () => {
      results.push('batch1-op1');
      return 'batch1-op1';
    });

    await queue.enqueue('tenant-1', async () => {
      results.push('batch1-op2');
      return 'batch1-op2';
    });

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 10));

    // Second batch
    await queue.enqueue('tenant-1', async () => {
      results.push('batch2-op1');
      return 'batch2-op1';
    });

    await queue.enqueue('tenant-1', async () => {
      results.push('batch2-op2');
      return 'batch2-op2';
    });

    assert.deepStrictEqual(results, ['batch1-op1', 'batch1-op2', 'batch2-op1', 'batch2-op2']);
  });
});

