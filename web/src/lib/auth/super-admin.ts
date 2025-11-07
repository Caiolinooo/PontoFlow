/**
 * Super Admin Management
 *
 * Super admins have global access across all tenants and can:
 * - Export data from all tenants
 * - Manage other super admins
 * - Access system-wide settings
 *
 * Security:
 * - System owner (Caio) is HARDCODED as permanent super admin
 * - Additional super admins stored in database table
 * - Regular admins CANNOT see or know about super admin functionality
 */

import { getServiceSupabase } from '@/lib/supabase/server';

/**
 * SYSTEM OWNER - Hardcoded permanent super admin
 * This email ALWAYS has super admin access regardless of database state
 *
 * SECURITY: This constant is intentionally obscured to prevent discovery
 * Do not reference this in UI or expose in any public-facing code
 */
const SYSTEM_OWNER_EMAIL = 'Caiovaleriogoulartcorreia@gmail.com';

/**
 * Check if a user is a super admin
 *
 * Super admin check order:
 * 1. Check if email matches SYSTEM_OWNER (hardcoded - always super admin)
 * 2. Check if email exists in super_admins table
 *
 * @param userEmail - Email address to check
 * @returns Promise<boolean> - True if user is super admin
 */
export async function isSuperAdmin(userEmail: string): Promise<boolean> {
  if (!userEmail) {
    return false;
  }

  const normalizedEmail = userEmail.toLowerCase().trim();

  // HARDCODED CHECK: System owner is ALWAYS super admin
  if (normalizedEmail === SYSTEM_OWNER_EMAIL.toLowerCase()) {
    return true;
  }

  // DATABASE CHECK: Check super_admins table
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('super_admins')
      .select('email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      // If table doesn't exist yet (pre-migration), only system owner is super admin
      if (error.code === '42P01') { // Table doesn't exist
        console.warn('[super-admin] super_admins table not found - only system owner has access');
        return false;
      }
      console.error('[super-admin] Error checking super admin status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('[super-admin] Exception checking super admin:', error);
    return false;
  }
}

/**
 * Synchronous version of isSuperAdmin for client-side checks
 *
 * WARNING: This only checks SYSTEM_OWNER
 * For complete check including database, use async isSuperAdmin()
 *
 * Use this for:
 * - Hiding UI elements
 * - Client-side conditional rendering
 *
 * @param userEmail - Email address to check
 * @returns boolean - True if email matches system owner
 */
export function isSuperAdminSync(userEmail: string): boolean {
  if (!userEmail) {
    return false;
  }

  const normalizedEmail = userEmail.toLowerCase().trim();
  return normalizedEmail === SYSTEM_OWNER_EMAIL.toLowerCase();
}

/**
 * Get list of all super admins (excluding system owner)
 *
 * NOTE: System owner is not stored in database (hardcoded)
 * This returns ADDITIONAL super admins only
 *
 * @returns Promise<Array> - List of super admin entries
 */
export async function listSuperAdmins(): Promise<Array<{
  id: string;
  email: string;
  created_at: string;
  created_by: string | null;
  notes: string | null;
}>> {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('super_admins')
      .select('id, email, created_at, created_by, notes')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[super-admin] Error listing super admins:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[super-admin] Exception listing super admins:', error);
    return [];
  }
}

/**
 * Add a new super admin
 *
 * @param email - Email of user to promote to super admin
 * @param createdBy - Email of super admin performing this action
 * @param notes - Optional notes about this super admin
 * @returns Promise<{success: boolean, error?: string}>
 */
export async function addSuperAdmin(
  email: string,
  createdBy: string,
  notes?: string
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Cannot add system owner (already hardcoded)
    if (normalizedEmail === SYSTEM_OWNER_EMAIL.toLowerCase()) {
      return { success: false, error: 'System owner is already permanent super admin' };
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('super_admins')
      .insert({
        email: normalizedEmail,
        created_by: createdBy,
        notes: notes || null
      })
      .select('id')
      .single();

    if (error) {
      // Duplicate email
      if (error.code === '23505') {
        return { success: false, error: 'Email already is a super admin' };
      }
      console.error('[super-admin] Error adding super admin:', error);
      return { success: false, error: error.message };
    }

    console.log(`[super-admin] Added new super admin: ${normalizedEmail} by ${createdBy}`);
    return { success: true, id: data.id };
  } catch (error) {
    console.error('[super-admin] Exception adding super admin:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Remove a super admin
 *
 * NOTE: Cannot remove system owner (hardcoded)
 *
 * @param id - UUID of super admin to remove
 * @returns Promise<{success: boolean, error?: string}>
 */
export async function removeSuperAdmin(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getServiceSupabase();

    // Check if trying to remove system owner
    const { data: existing } = await supabase
      .from('super_admins')
      .select('email')
      .eq('id', id)
      .single();

    if (existing && existing.email.toLowerCase() === SYSTEM_OWNER_EMAIL.toLowerCase()) {
      return { success: false, error: 'Cannot remove system owner' };
    }

    const { error } = await supabase
      .from('super_admins')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[super-admin] Error removing super admin:', error);
      return { success: false, error: error.message };
    }

    console.log(`[super-admin] Removed super admin: ${id}`);
    return { success: true };
  } catch (error) {
    console.error('[super-admin] Exception removing super admin:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Check if super admin table exists
 * Used for graceful degradation during migration rollout
 *
 * @returns Promise<boolean>
 */
export async function superAdminTableExists(): Promise<boolean> {
  try {
    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from('super_admins')
      .select('id')
      .limit(1);

    // If error is "table doesn't exist", return false
    if (error && error.code === '42P01') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
