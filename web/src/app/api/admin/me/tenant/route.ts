import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// Admin client for auth operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// GET: retorna tenant atual do usuário e lista de tenants (id, name)
export async function GET() {
  try {
    const user = await requireApiRole(['ADMIN']);
    const supabase = getServiceSupabase();

    // Get current tenant from user object (already resolved by auth)
    const current_tenant_id = user.tenant_id || null;

    // Get all tenants
    const { data: tenants } = await supabase.from('tenants').select('id, name').order('name');

    return NextResponse.json({ current_tenant_id, tenants: tenants ?? [] });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (e instanceof Error && e.message === 'Forbidden') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// PATCH: define o tenant atual do usuário
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);
    const body = await req.json().catch(() => ({}));
    const tenant_id = (body?.tenant_id as string | undefined)?.trim();
    if (!tenant_id) return NextResponse.json({ error: 'tenant_id_required' }, { status: 400 });

    const svc = getServiceSupabase();

    // Validate tenant exists
    const { data: t } = await svc.from('tenants').select('id').eq('id', tenant_id).maybeSingle();
    if (!t) return NextResponse.json({ error: 'invalid_tenant' }, { status: 400 });

    // Validate user has access to this tenant (check tenant_user_roles)
    const { data: userRole } = await svc
      .from('tenant_user_roles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (!userRole) {
      return NextResponse.json({ error: 'tenant_not_authorized' }, { status: 403 });
    }

    // Get current user metadata
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
    if (!authUser?.user) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    // Update user metadata with selected tenant
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...authUser.user.user_metadata,
        selected_tenant_id: tenant_id
      }
    });

    if (error) {
      console.error('[PATCH /api/admin/me/tenant] Error updating user metadata:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('[PATCH /api/admin/me/tenant] Successfully updated tenant for user:', user.id, 'to:', tenant_id);
    return NextResponse.json({ ok: true, tenant_id });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    console.error('[PATCH /api/admin/me/tenant] Error:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

