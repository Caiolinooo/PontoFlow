import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getApiUser } from '@/lib/auth/server';

/**
 * GET /api/reports/filter-options
 * Returns available vessels and groups for filtering based on user role and permissions
 * Response format:
 * {
 *   vessels: Array<{ id: string, name: string, code: string }>,
 *   groups: Array<{ id: string, name: string }>,
 *   hideVesselFilter: boolean,  // true if user has 0 or 1 vessels
 *   hideGroupFilter: boolean     // true if user has 0 or 1 groups
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getServerSupabase();

    let vessels: Array<{ id: string; name: string; code: string | null }> = [];
    let groups: Array<{ id: string; name: string }> = [];

    // Fetch vessels based on user role
    if (user.role === 'ADMIN' || user.role === 'TENANT_ADMIN') {
      // Admins see all vessels in their tenant
      const { data: allVessels } = await supabase
        .from('vessels')
        .select('id, name, code')
        .eq('tenant_id', user.tenant_id)
        .order('name');

      vessels = allVessels || [];
    } else if (user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') {
      // Managers see only their delegated vessels
      const { data: managerDelegations } = await supabase
        .from('manager_delegations')
        .select(`
          vessel_id,
          vessel:vessels!manager_delegations_vessel_id_fkey(id, name, code)
        `)
        .eq('manager_id', user.id)
        .not('vessel_id', 'is', null);

      if (managerDelegations) {
        vessels = managerDelegations
          .map(d => (Array.isArray(d.vessel) ? d.vessel[0] : d.vessel))
          .filter(Boolean) as Array<{ id: string; name: string; code: string | null }>;
      }
    } else {
      // Regular users see only their own vessel (if they have one)
      const { data: employee } = await supabase
        .from('employees')
        .select(`
          vessel_id,
          vessel:vessels!employees_vessel_id_fkey(id, name, code)
        `)
        .eq('profile_id', user.id)
        .eq('tenant_id', user.tenant_id)
        .maybeSingle();

      if (employee?.vessel) {
        const vessel = Array.isArray(employee.vessel) ? employee.vessel[0] : employee.vessel;
        if (vessel) {
          vessels = [vessel];
        }
      }
    }

    // Fetch groups based on user role
    if (user.role === 'ADMIN' || user.role === 'TENANT_ADMIN') {
      // Admins see all groups in their tenant
      const { data: allGroups } = await supabase
        .from('employee_groups')
        .select('id, name')
        .eq('tenant_id', user.tenant_id)
        .order('name');

      groups = allGroups || [];
    } else if (user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') {
      // Managers see only their delegated groups
      const { data: managerDelegations } = await supabase
        .from('manager_delegations')
        .select(`
          group_id,
          group:employee_groups!manager_delegations_group_id_fkey(id, name)
        `)
        .eq('manager_id', user.id)
        .not('group_id', 'is', null);

      if (managerDelegations) {
        groups = managerDelegations
          .map(d => (Array.isArray(d.group) ? d.group[0] : d.group))
          .filter(Boolean) as Array<{ id: string; name: string }>;
      }
    } else {
      // Regular users don't have group filtering
      groups = [];
    }

    // Determine if filters should be hidden (0 or 1 option means no need for filter)
    const hideVesselFilter = vessels.length <= 1;
    const hideGroupFilter = groups.length <= 1;

    console.log('[FILTER OPTIONS] User:', user.role, 'Vessels:', vessels.length, 'Groups:', groups.length);

    return NextResponse.json({
      vessels,
      groups,
      hideVesselFilter,
      hideGroupFilter,
    });
  } catch (err) {
    console.error('[FILTER OPTIONS] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
