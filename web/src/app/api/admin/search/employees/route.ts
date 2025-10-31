import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

// GET /api/admin/search/employees?q=...&limit=20
export async function GET(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN', 'MANAGER', 'MANAGER_TIMESHEET']);
    if (!user.tenant_id) return NextResponse.json({ error: 'missing_tenant' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const limitRaw = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.max(1, Math.min(isNaN(limitRaw) ? 20 : limitRaw, 100));
    const offsetRaw = parseInt(searchParams.get('offset') || '0', 10);
    const offset = Math.max(0, isNaN(offsetRaw) ? 0 : offsetRaw);

    const supabase = await getServerSupabase();

    // Search by employees.name and profiles.display_name/email
    // 1) Base: employees by tenant
    let baseIds: string[] = [];

    if (q) {
      // Search employees by name
      const { data: byName } = await supabase
        .from('employees')
        .select('id')
        .eq('tenant_id', user.tenant_id as string)
        .ilike('name', `%${q}%`)
        .limit(limit);
      baseIds = [...new Set((byName ?? []).map((r: any) => r.id))];

      // Search profiles for display_name/email and map to employees
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id')
        .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(limit);
      const profileIds = [...new Set((profs ?? []).map((p: any) => p.user_id))];
      if (profileIds.length) {
        const { data: byProfile } = await supabase
          .from('employees')
          .select('id, profile_id')
          .eq('tenant_id', user.tenant_id as string)
          .in('profile_id', profileIds)
          .limit(limit);
        baseIds = [...new Set([...baseIds, ...((byProfile ?? []).map((e: any) => e.id))])];
      }
    }

    let employeesQuery = supabase
      .from('employees')
      .select('id, profile_id, name')
      .eq('tenant_id', user.tenant_id as string)
      .order('id')
      .range(offset, offset + limit - 1);

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

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

