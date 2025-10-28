import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

/**
 * GET /api/employee/tenants
 * 
 * Returns all tenants (organizations) that the current user belongs to
 * Used for multi-tenant support - allows users to switch between organizations
 */

export async function GET(_req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const supabase = await getServerSupabase();

    // Get all employee records for this user (one per tenant)
    // Note: We fetch employees and tenants separately to avoid ambiguous relationship error
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, tenant_id, cargo, centro_custo')
      .eq('profile_id', user.id);

    if (empError) {
      console.error('Error fetching employee tenants:', empError);
      return NextResponse.json({ error: empError.message }, { status: 400 });
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json({
        tenants: [],
        count: 0
      });
    }

    // Fetch tenant details separately
    const tenantIds = [...new Set(employees.map(emp => emp.tenant_id))];
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .in('id', tenantIds);

    if (tenantError) {
      console.error('Error fetching tenants:', tenantError);
      return NextResponse.json({ error: tenantError.message }, { status: 400 });
    }

    // Create a map of tenant data for quick lookup
    const tenantMap = new Map(
      (tenantData || []).map(t => [t.id, t])
    );

    // Transform the data to a cleaner format
    const tenants = employees.map((emp: any) => {
      const tenant = tenantMap.get(emp.tenant_id);
      return {
        tenant_id: emp.tenant_id,
        tenant_name: tenant?.name || 'Unknown',
        tenant_slug: tenant?.slug || '',
        employee_id: emp.id,
        cargo: emp.cargo,
        centro_custo: emp.centro_custo,
      };
    });

    return NextResponse.json({
      tenants,
      count: tenants.length
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('GET employee tenants error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

