/**
 * Soft Delete Helpers
 *
 * Utilities for managing soft deleted records in PontoFlow
 *
 * Features:
 * - Soft delete records (set deleted_at)
 * - Restore deleted records (clear deleted_at)
 * - Query active records (filter deleted_at IS NULL)
 * - Hard delete old records (permanent deletion after retention period)
 */

import { getServiceSupabase } from '@/lib/supabase/server';

// ==========================================
// Types
// ==========================================

export type SoftDeleteTable =
  | 'tenants'
  | 'profiles'
  | 'users_unified'
  | 'employees'
  | 'groups'
  | 'environments'
  | 'timesheets'
  | 'timesheet_entries'
  | 'vessels';

export interface SoftDeleteResult {
  success: boolean;
  message: string;
  id?: string;
}

export interface HardDeleteResult {
  success: boolean;
  message: string;
  count: number;
}

// ==========================================
// Soft Delete Functions
// ==========================================

/**
 * Soft delete a record by setting deleted_at timestamp
 *
 * @param table Table name
 * @param id Record ID
 * @param deletedBy Optional: User ID who performed the deletion
 * @returns Result with success status
 */
export async function softDelete(
  table: SoftDeleteTable,
  id: string,
  deletedBy?: string
): Promise<SoftDeleteResult> {
  try {
    const supabase = await getServiceSupabase();

    // Update record with deleted_at timestamp
    const { data, error } = await supabase
      .from(table)
      .update({
        deleted_at: new Date().toISOString(),
        // Some tables may have deleted_by column
        ...(deletedBy && { deleted_by: deletedBy })
      })
      .eq('id', id)
      .is('deleted_at', null) // Only delete if not already deleted
      .select('id')
      .single();

    if (error) {
      console.error(`[SoftDelete] Error deleting ${table}:`, error);
      return {
        success: false,
        message: error.message
      };
    }

    if (!data) {
      return {
        success: false,
        message: 'Record not found or already deleted'
      };
    }

    console.log(`[SoftDelete] Successfully soft deleted ${table} record:`, id);
    return {
      success: true,
      message: 'Record soft deleted successfully',
      id: data.id
    };
  } catch (error) {
    console.error(`[SoftDelete] Exception deleting ${table}:`, error);
    return {
      success: false,
      message: 'An error occurred while deleting the record'
    };
  }
}

/**
 * Restore a soft deleted record by clearing deleted_at
 *
 * @param table Table name
 * @param id Record ID
 * @returns Result with success status
 */
export async function restoreDeleted(
  table: SoftDeleteTable,
  id: string
): Promise<SoftDeleteResult> {
  try {
    const supabase = await getServiceSupabase();

    // Clear deleted_at timestamp
    const { data, error } = await supabase
      .from(table)
      .update({ deleted_at: null })
      .eq('id', id)
      .not('deleted_at', 'is', null) // Only restore if already deleted
      .select('id')
      .single();

    if (error) {
      console.error(`[SoftDelete] Error restoring ${table}:`, error);
      return {
        success: false,
        message: error.message
      };
    }

    if (!data) {
      return {
        success: false,
        message: 'Record not found or not deleted'
      };
    }

    console.log(`[SoftDelete] Successfully restored ${table} record:`, id);
    return {
      success: true,
      message: 'Record restored successfully',
      id: data.id
    };
  } catch (error) {
    console.error(`[SoftDelete] Exception restoring ${table}:`, error);
    return {
      success: false,
      message: 'An error occurred while restoring the record'
    };
  }
}

/**
 * Check if a record is soft deleted
 *
 * @param table Table name
 * @param id Record ID
 * @returns True if deleted, false if active or not found
 */
export async function isDeleted(
  table: SoftDeleteTable,
  id: string
): Promise<boolean> {
  try {
    const supabase = await getServiceSupabase();

    const { data, error } = await supabase
      .from(table)
      .select('deleted_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return false;
    }

    return data.deleted_at !== null;
  } catch (error) {
    console.error(`[SoftDelete] Exception checking ${table}:`, error);
    return false;
  }
}

/**
 * Get deleted records (for admin/audit purposes)
 *
 * @param table Table name
 * @param limit Maximum number of records to return
 * @returns Array of deleted records
 */
export async function getDeletedRecords(
  table: SoftDeleteTable,
  limit: number = 100
): Promise<any[]> {
  try {
    const supabase = await getServiceSupabase();

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(`[SoftDelete] Error fetching deleted ${table}:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error(`[SoftDelete] Exception fetching deleted ${table}:`, error);
    return [];
  }
}

/**
 * Hard delete records that have been soft deleted for a specified period
 *
 * WARNING: This permanently deletes data! Use with caution!
 *
 * @param table Table name
 * @param olderThanDays Delete records soft deleted more than this many days ago
 * @returns Result with count of deleted records
 */
export async function hardDeleteOldRecords(
  table: SoftDeleteTable,
  olderThanDays: number = 90
): Promise<HardDeleteResult> {
  try {
    // Safety check
    if (olderThanDays < 30) {
      return {
        success: false,
        message: 'olderThanDays must be at least 30 days for safety',
        count: 0
      };
    }

    const supabase = await getServiceSupabase();

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Delete records
    const { data, error } = await supabase
      .from(table)
      .delete()
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      console.error(`[SoftDelete] Error hard deleting ${table}:`, error);
      return {
        success: false,
        message: error.message,
        count: 0
      };
    }

    const count = data?.length || 0;
    console.log(`[SoftDelete] Hard deleted ${count} records from ${table} (older than ${olderThanDays} days)`);

    return {
      success: true,
      message: `Successfully hard deleted ${count} records`,
      count
    };
  } catch (error) {
    console.error(`[SoftDelete] Exception hard deleting ${table}:`, error);
    return {
      success: false,
      message: 'An error occurred while hard deleting records',
      count: 0
    };
  }
}

// ==========================================
// Query Helpers
// ==========================================

/**
 * Add soft delete filter to Supabase query
 *
 * Usage:
 * ```typescript
 * const query = supabase.from('employees').select('*');
 * const filtered = withActiveFilter(query);
 * const { data } = await filtered;
 * ```
 */
export function withActiveFilter<T>(query: any): any {
  return query.is('deleted_at', null);
}

/**
 * Add deleted filter to Supabase query (for admin views)
 */
export function withDeletedFilter<T>(query: any): any {
  return query.not('deleted_at', 'is', null);
}

// ==========================================
// Batch Operations
// ==========================================

/**
 * Soft delete multiple records at once
 *
 * @param table Table name
 * @param ids Array of record IDs
 * @param deletedBy Optional: User ID who performed the deletion
 * @returns Result with success status and count
 */
export async function softDeleteBatch(
  table: SoftDeleteTable,
  ids: string[],
  deletedBy?: string
): Promise<HardDeleteResult> {
  try {
    if (ids.length === 0) {
      return {
        success: true,
        message: 'No records to delete',
        count: 0
      };
    }

    const supabase = await getServiceSupabase();

    // Update records with deleted_at timestamp
    const { data, error } = await supabase
      .from(table)
      .update({
        deleted_at: new Date().toISOString(),
        ...(deletedBy && { deleted_by: deletedBy })
      })
      .in('id', ids)
      .is('deleted_at', null) // Only delete if not already deleted
      .select('id');

    if (error) {
      console.error(`[SoftDelete] Error batch deleting ${table}:`, error);
      return {
        success: false,
        message: error.message,
        count: 0
      };
    }

    const count = data?.length || 0;
    console.log(`[SoftDelete] Successfully soft deleted ${count} ${table} records`);

    return {
      success: true,
      message: `Successfully soft deleted ${count} records`,
      count
    };
  } catch (error) {
    console.error(`[SoftDelete] Exception batch deleting ${table}:`, error);
    return {
      success: false,
      message: 'An error occurred while deleting records',
      count: 0
    };
  }
}

/**
 * Restore multiple deleted records at once
 */
export async function restoreDeletedBatch(
  table: SoftDeleteTable,
  ids: string[]
): Promise<HardDeleteResult> {
  try {
    if (ids.length === 0) {
      return {
        success: true,
        message: 'No records to restore',
        count: 0
      };
    }

    const supabase = await getServiceSupabase();

    // Clear deleted_at timestamp
    const { data, error } = await supabase
      .from(table)
      .update({ deleted_at: null })
      .in('id', ids)
      .not('deleted_at', 'is', null) // Only restore if already deleted
      .select('id');

    if (error) {
      console.error(`[SoftDelete] Error batch restoring ${table}:`, error);
      return {
        success: false,
        message: error.message,
        count: 0
      };
    }

    const count = data?.length || 0;
    console.log(`[SoftDelete] Successfully restored ${count} ${table} records`);

    return {
      success: true,
      message: `Successfully restored ${count} records`,
      count
    };
  } catch (error) {
    console.error(`[SoftDelete] Exception batch restoring ${table}:`, error);
    return {
      success: false,
      message: 'An error occurred while restoring records',
      count: 0
    };
  }
}

// ==========================================
// Cascade Soft Delete (Manual)
// ==========================================

/**
 * Soft delete an employee and all their related records
 *
 * This manually cascades the soft delete to related tables
 * (timesheets, timesheet_entries, etc.)
 */
export async function softDeleteEmployeeCascade(
  employeeId: string,
  deletedBy?: string
): Promise<SoftDeleteResult> {
  try {
    const supabase = await getServiceSupabase();

    // 1. Get all timesheets for this employee
    const { data: timesheets } = await supabase
      .from('timesheets')
      .select('id')
      .eq('employee_id', employeeId)
      .is('deleted_at', null);

    const timesheetIds = timesheets?.map(t => t.id) || [];

    // 2. Soft delete timesheet entries
    if (timesheetIds.length > 0) {
      await softDeleteBatch('timesheet_entries', timesheetIds, deletedBy);
    }

    // 3. Soft delete timesheets
    if (timesheetIds.length > 0) {
      await softDeleteBatch('timesheets', timesheetIds, deletedBy);
    }

    // 4. Soft delete employee
    const result = await softDelete('employees', employeeId, deletedBy);

    if (result.success) {
      console.log(`[SoftDelete] Cascade deleted employee ${employeeId} and ${timesheetIds.length} related timesheets`);
    }

    return result;
  } catch (error) {
    console.error('[SoftDelete] Exception in cascade delete:', error);
    return {
      success: false,
      message: 'An error occurred while cascading delete'
    };
  }
}
