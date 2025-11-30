import express from 'express';
import counterService from '../services/counter.js';
import queue from '../services/queue.js';
import ApiError from '../errors/errors.js';
import { formatOrderNumber } from '../utils/index.js';

const router = express.Router();

/**
 * GET /counter
 * Retrieve counter by tenantId and increment the value (from API key middleware)
 * This combines get and update operations - the counter is incremented on each GET request
 * Uses a queue to serialize operations per tenant, preventing race conditions
 */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.tenant_id;

    if (!tenantId) {
      throw ApiError.badRequest('Tenant ID is required');
    }

    // Queue the increment operation to prevent race conditions
    const counter = await queue.enqueue(tenantId, async () => {
      // Get the current counter
      const counter = await counterService.getByTenantId(tenantId);

      if (!counter) {
        throw ApiError.notFound('Counter not found for this tenant');
      }

      // Validate value is a valid number
      if (counter.value === null || counter.value === undefined) {
        throw ApiError.internal('Counter value is invalid');
      }

      const currentValue = Number(counter.value);
      
      if (isNaN(currentValue) || !Number.isInteger(currentValue)) {
        throw ApiError.internal('Counter value must be an integer');
      }

      if (currentValue < 0) {
        throw ApiError.internal('Counter value cannot be negative');
      }

      // Check for potential integer overflow (PostgreSQL integer max is 2147483647)
      if (currentValue >= 2147483647) {
        throw ApiError.internal('Counter has reached maximum value');
      }

      // Store the old value before incrementing
      const oldCounter = { ...counter };
      
      // Increment the counter
      const nextOrderNumber = currentValue + 1;

      const updates = {
        value: nextOrderNumber,
      };

      // Update the counter - if this fails, we haven't sent a response yet
      await counterService.updateByTenantId(tenantId, updates);

      const formattedOrderNumber = formatOrderNumber(nextOrderNumber);

      // Return the old counter value (before increment)
      return {order_number: formattedOrderNumber};
    });

    res.json(counter);
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else if (error.message.includes('not found')) {
      next(ApiError.notFound(error.message));
    } else {
      next(ApiError.internal(error.message));
    }
  }
});

/**
 * GET /counter/all
 * Retrieve all counters (non-deleted)
 */
router.get('/all', async (req, res, next) => {
  try {
    const counters = await counterService.getAll();
    res.json(counters);
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(ApiError.internal(error.message));
    }
  }
});

/**
 * GET /counter/deleted
 * Retrieve all deleted counters
 */
router.get('/deleted', async (req, res, next) => {
  try {
    const counters = await counterService.getDeleted();
    res.json(counters);
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(ApiError.internal(error.message));
    }
  }
});

/**
 * GET /counter/:id
 * Retrieve a counter by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw ApiError.badRequest('Counter ID is required');
    }

    const counter = await counterService.getById(id);

    if (!counter) {
      throw ApiError.notFound('Counter not found');
    }

    res.json(counter);
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else if (error.message.includes('not found')) {
      next(ApiError.notFound(error.message));
    } else {
      next(ApiError.internal(error.message));
    }
  }
});

/**
 * POST /counter
 * Create a new counter
 * Expects JSON body with counter data (e.g., { name: 'Counter Name', value: 0, tenant_id: 'uuid' })
 */
router.post('/', async (req, res, next) => {
  try {
    const counterData = req.body;

    if (!counterData || Object.keys(counterData).length === 0) {
      throw ApiError.badRequest('Counter data is required');
    }

    // Validate required fields
    if (!counterData.name) {
      throw ApiError.badRequest('Counter name is required');
    }

    if (counterData.value === undefined || counterData.value === null) {
      throw ApiError.badRequest('Counter value is required');
    }

    if (!counterData.tenant_id) {
      throw ApiError.badRequest('Tenant ID is required');
    }

    const counter = await counterService.create(counterData);
    res.status(201).json(counter);
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else if (error.message.includes('not found')) {
      next(ApiError.notFound(error.message));
    } else {
      next(ApiError.internal(error.message));
    }
  }
});

/**
 * PUT /counter/:id
 * Update a counter by ID
 * Expects JSON body with fields to update (e.g., { value: 10, name: 'Updated Name' })
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      throw ApiError.badRequest('Counter ID is required');
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw ApiError.badRequest('Update data is required');
    }

    // Prevent updating id, tenant_id, created_at, deleted_at
    const { id: _, tenant_id, created_at, deleted_at, ...allowedUpdates } = updates;

    if (Object.keys(allowedUpdates).length === 0) {
      throw ApiError.badRequest('No valid fields to update');
    }

    const updatedCounter = await counterService.updateById(id, allowedUpdates);
    res.json(updatedCounter);
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else if (error.message.includes('not found')) {
      next(ApiError.notFound(error.message));
    } else {
      next(ApiError.internal(error.message));
    }
  }
});

/**
 * DELETE /counter/:id/permanent
 * Permanently delete a counter from the database
 * Must come before DELETE /:id to ensure proper route matching
 */
router.delete('/:id/permanent', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw ApiError.badRequest('Counter ID is required');
    }

    await counterService.permanentDelete(id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else if (error.message.includes('not found')) {
      next(ApiError.notFound(error.message));
    } else {
      next(ApiError.internal(error.message));
    }
  }
});

/**
 * DELETE /counter/:id
 * Soft delete a counter by ID (sets deleted_at timestamp)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw ApiError.badRequest('Counter ID is required');
    }

    const deletedCounter = await counterService.delete(id);
    res.json(deletedCounter);
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else if (error.message.includes('not found')) {
      next(ApiError.notFound(error.message));
    } else {
      next(ApiError.internal(error.message));
    }
  }
});

/**
 * POST /counter/:id/restore
 * Restore a soft-deleted counter (removes deleted_at timestamp)
 */
router.post('/:id/restore', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw ApiError.badRequest('Counter ID is required');
    }

    const restoredCounter = await counterService.restore(id);
    res.json(restoredCounter);
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else if (error.message.includes('not found')) {
      next(ApiError.notFound(error.message));
    } else if (error.message.includes('not deleted')) {
      next(ApiError.badRequest(error.message));
    } else {
      next(ApiError.internal(error.message));
    }
  }
});

export default router;

