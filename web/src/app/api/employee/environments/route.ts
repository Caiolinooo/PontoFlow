import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireApiAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { pickActiveEmployee } from '@/lib/employee/active-tenant';

/**
 * GET /api/employee/environments
 *
 * Returns all environments for the employee's tenant(s)
 * Used in timesheet entry creation to select work location
 */

export async function GET(_req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const supabase = getServiceSupabase();
    const requestedTenant = _req.nextUrl.searchParams.get('tenant_id');
    const cookieStore = await cookies();
    const cookieTenant = cookieStore.get('selected_tenant_id')?.value;

    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, tenant_id')
      .eq('profile_id', user.id);

    if (empError) {
      console.error('Error fetching employee:', empError);
      return NextResponse.json({ error: empError.message }, { status: 400 });
    }

    const tenantIds = [...new Set((employees ?? []).map((row) => row.tenant_id))];
    const { data: tenantRows } = tenantIds.length
      ? await supabase.from('tenants').select('id, work_mode').in('id', tenantIds)
      : { data: [] as Array<{ id: string; work_mode: string | null }> };

    const modeByTenant = new Map((tenantRows ?? []).map((row) => [row.id, row.work_mode]));
    const rows = (employees ?? []).map((row) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      work_mode: modeByTenant.get(row.tenant_id) ?? null,
    }));

    const active = pickActiveEmployee(rows, requestedTenant || cookieTenant || null);
    if (!active) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const { data: environments, error: envError } = await supabase
      .from('environments')
      .select('id, name, slug, color, auto_fill_enabled')
      .eq('tenant_id', active.tenant_id)
      .neq('slug', 'teste')
      .order('name');

    if (envError) {
      console.error('Error fetching environments:', envError);
      return NextResponse.json({ error: envError.message }, { status: 400 });
    }

    return NextResponse.json({ environments: environments || [] });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('GET environments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

