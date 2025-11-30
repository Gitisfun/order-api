import { dbClient } from '../config/supabase.js';

class CounterService {
  constructor() {
    this.tableName = 'counters';
  }

  /**
   * Retrieve a counter row by tenantId
   * @param {string} tenantId - The tenant ID (UUID)
   * @returns {Promise<Object|null>} The counter row or null if not found
   * @throws {Error} If database query fails
   */
  async getByTenantId(tenantId) {
    try {
      const { data, error } = await dbClient
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single();

      if (error) {
        // If no rows found, Supabase returns an error with code 'PGRST116'
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to retrieve counter by tenantId: ${error.message}`);
    }
  }

  /**
   * Update a counter row by tenantId
   * @param {string} tenantId - The tenant ID (UUID)
   * @param {Object} updates - The fields to update (e.g., { value: 5, name: 'New Name' })
   * @returns {Promise<Object>} The updated counter row
   * @throws {Error} If database update fails or row not found
   */
  async updateByTenantId(tenantId, updates) {
    try {
      // First, check if the row exists
      const existing = await this.getByTenantId(tenantId);
      if (!existing) {
        throw new Error(`Counter with tenantId ${tenantId} not found`);
      }

      // Add updated_at timestamp
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await dbClient
        .from(this.tableName)
        .update(updateData)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to update counter by tenantId: ${error.message}`);
    }
  }

  /**
   * Retrieve all counter rows (non-deleted) with tenant name
   * @returns {Promise<Array>} Array of counter rows with tenant information
   * @throws {Error} If database query fails
   */
  async getAll() {
    try {
      const { data, error } = await dbClient
        .from(this.tableName)
        .select('*, tenant:tenant_id(name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to retrieve all counters: ${error.message}`);
    }
  }

  /**
   * Retrieve a counter row by ID with tenant name
   * @param {string} id - The counter ID (UUID)
   * @returns {Promise<Object|null>} The counter row with tenant information or null if not found
   * @throws {Error} If database query fails
   */
  async getById(id) {
    try {
      const { data, error } = await dbClient
        .from(this.tableName)
        .select('*, tenant:tenant_id(name)')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        // If no rows found, Supabase returns an error with code 'PGRST116'
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to retrieve counter by id: ${error.message}`);
    }
  }

  /**
   * Update a counter row by ID
   * @param {string} id - The counter ID (UUID)
   * @param {Object} updates - The fields to update (e.g., { value: 5, name: 'New Name' })
   * @returns {Promise<Object>} The updated counter row
   * @throws {Error} If database update fails or row not found
   */
  async updateById(id, updates) {
    try {
      // First, check if the row exists
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error(`Counter with id ${id} not found`);
      }

      // Add updated_at timestamp
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await dbClient
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to update counter by id: ${error.message}`);
    }
  }

  /**
   * Create a new counter row
   * @param {Object} counterData - The counter data (e.g., { name: 'Counter Name', value: 0, tenant_id: 'uuid' })
   * @returns {Promise<Object>} The created counter row
   * @throws {Error} If database insert fails
   */
  async create(counterData) {
    try {
      const now = new Date().toISOString();
      const insertData = {
        ...counterData,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await dbClient
        .from(this.tableName)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to create counter: ${error.message}`);
    }
  }

  /**
   * Soft delete a counter row by ID (sets deleted_at timestamp)
   * @param {string} id - The counter ID (UUID)
   * @returns {Promise<Object>} The deleted counter row
   * @throws {Error} If database update fails or row not found
   */
  async delete(id) {
    try {
      // First, check if the row exists and is not already deleted
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error(`Counter with id ${id} not found`);
      }

      const now = new Date().toISOString();
      const { data, error } = await dbClient
        .from(this.tableName)
        .update({
          deleted_at: now,
          updated_at: now,
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to delete counter: ${error.message}`);
    }
  }

  /**
   * Restore a soft-deleted counter row (removes deleted_at timestamp)
   * @param {string} id - The counter ID (UUID)
   * @returns {Promise<Object>} The restored counter row
   * @throws {Error} If database update fails or row not found
   */
  async restore(id) {
    try {
      // Check if the row exists (including deleted ones)
      const { data: existing, error: fetchError } = await dbClient
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        throw new Error(`Counter with id ${id} not found`);
      }

      if (!existing.deleted_at) {
        throw new Error(`Counter with id ${id} is not deleted`);
      }

      const now = new Date().toISOString();
      const { data, error } = await dbClient
        .from(this.tableName)
        .update({
          deleted_at: null,
          updated_at: now,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to restore counter: ${error.message}`);
    }
  }

  /**
   * Retrieve all soft-deleted counter rows with tenant name
   * @returns {Promise<Array>} Array of deleted counter rows with tenant information
   * @throws {Error} If database query fails
   */
  async getDeleted() {
    try {
      const { data, error } = await dbClient
        .from(this.tableName)
        .select('*, tenant:tenant_id(name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to retrieve deleted counters: ${error.message}`);
    }
  }

  /**
   * Permanently delete a counter row from the database
   * @param {string} id - The counter ID (UUID)
   * @returns {Promise<boolean>} True if deletion was successful
   * @throws {Error} If database delete fails
   */
  async permanentDelete(id) {
    try {
      const { error } = await dbClient
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to permanently delete counter: ${error.message}`);
    }
  }

  /**
   * Get all unique tenant IDs from non-deleted counters
   * @returns {Promise<Array<string>>} Array of tenant IDs
   * @throws {Error} If database query fails
   */
  async getAllTenantIds() {
    try {
      const { data, error } = await dbClient
        .from(this.tableName)
        .select('tenant_id')
        .is('deleted_at', null);

      if (error) {
        throw error;
      }

      // Get unique tenant IDs
      const uniqueTenantIds = [...new Set(data.map(item => item.tenant_id))];
      return uniqueTenantIds;
    } catch (error) {
      throw new Error(`Failed to retrieve tenant IDs: ${error.message}`);
    }
  }

  /**
   * Reset all non-deleted counters to value 1
   * @returns {Promise<number>} Number of counters reset
   * @throws {Error} If database update fails
   */
  async resetAllCounters() {
    try {
      const now = new Date().toISOString();
      const { data, error } = await dbClient
        .from(this.tableName)
        .update({
          value: 1,
          updated_at: now,
        })
        .is('deleted_at', null)
        .select('id');

      if (error) {
        throw error;
      }

      return data ? data.length : 0;
    } catch (error) {
      throw new Error(`Failed to reset all counters: ${error.message}`);
    }
  }
}

export default new CounterService();

