import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

// GET: retorna tenant atual do usuário e lista de tenants (id, name)
export async function GET() {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase();
  const [{ data: tenants }, { data: me }] = await Promise.all([
    supabase.from('tenants').select('id, name').order('name'),
    supabase.from('users_unified').select('tenant_id').eq('id', user.id).maybeSingle(),
  ]);
  return NextResponse.json({ current_tenant_id: me?.tenant_id ?? null, tenants: tenants ?? [] });
}

// PATCH: define o tenant atual do usuário
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);
    const body = await req.json().catch(() => ({}));
    const tenant_id = (body?.tenant_id as string | undefined)?.trim();
    if (!tenant_id) return NextResponse.json({ error: 'tenant_id_required' }, { status: 400 });

    const svc = getServiceSupabase();
    // valida existência do tenant
    const { data: t } = await svc.from('tenants').select('id').eq('id', tenant_id).maybeSingle();
    if (!t) return NextResponse.json({ error: 'invalid_tenant' }, { status: 400 });

    const { error } = await svc.from('users_unified').update({ tenant_id }).eq('id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, tenant_id });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

