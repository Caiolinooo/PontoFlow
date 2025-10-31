import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';

/**
 * GET /api/employee/environments
 *
 * Returns all environments for the employee's tenant(s)
 * Used in timesheet entry creation to select work location
 */

export async function GET(_req: NextRequest) {
  try {
    const user = await requireApiAuth();
    // Use service client to bypass RLS
    const supabase = getServiceSupabase();

    // Get employee record to find tenant_id
    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select('id, tenant_id')
      .eq('profile_id', user.id)
      .limit(1)
      .maybeSingle();

    if (empError) {
      console.error('Error fetching employee:', empError);
      return NextResponse.json({ error: empError.message }, { status: 400 });
    }

    if (!emp) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get all environments for this tenant
    const { data: environments, error: envError } = await supabase
      .from('environments')
      .select('id, name, slug, color, auto_fill_enabled')
      .eq('tenant_id', emp.tenant_id)
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

