import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * POST /api/employee/set-tenant
 * 
 * Sets the selected tenant for multi-tenant users
 * Stores the selection in a cookie so the server can use it
 */

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const body = await req.json();
    const { tenant_id } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    const supabase = await getServerSupabase();

    // Verify that the user has access to this tenant
    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('profile_id', user.id)
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (empError || !emp) {
      return NextResponse.json({ error: 'User does not have access to this tenant' }, { status: 403 });
    }

    // Set the cookie
    const cookieStore = await cookies();
    cookieStore.set('selected_tenant_id', tenant_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });

    return NextResponse.json({ success: true, tenant_id });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('POST set-tenant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

