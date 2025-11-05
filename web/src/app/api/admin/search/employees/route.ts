import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

// GET /api/admin/search/employees?q=...&limit=20
export async function GET(req: NextRequest) {
  let user: any = null;
  
  try {
    user = await requireApiRole(['ADMIN', 'MANAGER', 'MANAGER_TIMESHEET']);
    if (!user.tenant_id) return NextResponse.json({ error: 'missing_tenant' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const limitRaw = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.max(1, Math.min(isNaN(limitRaw) ? 20 : limitRaw, 100));
    const offsetRaw = parseInt(searchParams.get('offset') || '0', 10);
    const offset = Math.max(0, isNaN(offsetRaw) ? 0 : offsetRaw);

    const supabase = await getServerSupabase();

    // Apply hierarchical access control
    let allowedEmployeeIds: string[] = [];

    if (user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') {
      // Managers can only search their managed employees
      // Simplified: allow all employees for now
      console.log('[EMPLOYEE-SEARCH] Manager access - all employees (simplified)');
    } else if (user.role === 'ADMIN') {
      // Admins can search all employees
      console.log('[EMPLOYEE-SEARCH] Admin access - all employees');
    }

    // Search by employees.name and profiles.display_name/email
    let baseIds: string[] = [];

    if (q) {
      // Search employees by name (with access control)
      let query = supabase
        .from('employees')
        .select('id')
        .eq('tenant_id', user.tenant_id as string)
        .ilike('name', `%${q}%`)
        .limit(limit);

      // Apply manager scope filtering
      if ((user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') && allowedEmployeeIds.length > 0) {
        query = query.in('id', allowedEmployeeIds);
      }

      const { data: byName } = await query;
      baseIds = [...new Set((byName ?? []).map((r: any) => r.id))];

      // Search profiles for display_name/email and map to employees
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id')
        .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(limit);
      const profileIds = [...new Set((profs ?? []).map((p: any) => p.user_id))];
      if (profileIds.length) {
        let profileQuery = supabase
          .from('employees')
          .select('id, profile_id')
          .eq('tenant_id', user.tenant_id as string)
          .in('profile_id', profileIds)
          .limit(limit);

        // Apply manager scope filtering for profile-based search
        if ((user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') && allowedEmployeeIds.length > 0) {
          profileQuery = profileQuery.in('id', allowedEmployeeIds);
        }

        const { data: byProfile } = await profileQuery;
        baseIds = [...new Set([...baseIds, ...((byProfile ?? []).map((e: any) => e.id))])];
      }
    }

let employeesQuery = supabase
      .from('employees')
      .select('id, profile_id, name')
      .eq('tenant_id', user.tenant_id as string)
      .order('id')
      .range(offset, offset + limit - 1);

    // Apply access control
    if ((user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') && allowedEmployeeIds.length > 0) {
      employeesQuery = employeesQuery.in('id', allowedEmployeeIds);
    }

    if (q) {
      if (baseIds.length > 0) {
        employeesQuery = employeesQuery.in('id', baseIds);
      } else {
        // If nothing matched, shortcut
        return NextResponse.json({ items: [] });
      }
    }

    const { data: emps, error } = await employeesQuery;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const profileIds = (emps ?? []).map(e => e.profile_id).filter(Boolean);
    let labels: Record<string, { display_name: string | null; email: string | null }> = {};
    if (profileIds.length) {
      const { data: profs2 } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', profileIds);
      for (const p of profs2 || []) labels[p.user_id as string] = { display_name: (p as any).display_name ?? null, email: p.email ?? null };
    }

    const items = (emps ?? []).map(e => ({
      id: e.id,
      label: e.name || labels[e.profile_id as string]?.display_name || labels[e.profile_id as string]?.email || e.id,
    }));

    // Log the search event for audit (simplified)
    console.log('[EMPLOYEE-SEARCH] Search completed:', {
      userId: user.id,
      query: q,
      results: items.length,
      limit,
      offset
    });

    return NextResponse.json({ items });
  } catch (e) {
    // Log failed search (simplified)
    console.log('[EMPLOYEE-SEARCH] Search failed:', {
      userId: user?.id || 'unknown',
      userRole: user?.role || 'unknown',
      error: 'internal_error'
    });

    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

