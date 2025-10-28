import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';

// GET /api/admin/periods/environments?environment_id=... -> list locks for an environment
export async function GET(req: NextRequest) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = getServiceSupabase();
  const url = new URL(req.url);
  const environmentId = (url.searchParams.get('environment_id') || '').trim();
  if (!environmentId) return NextResponse.json({ error: 'environment_id_required' }, { status: 400 });

  let tenantId = user.tenant_id as string | undefined;
  if (!tenantId) {
    const svc = getServiceSupabase();
    const { data: tenants } = await svc.from('tenants').select('id').limit(2);
    if (tenants && tenants.length === 1) {
      tenantId = tenants[0].id;
      await svc.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
    } else {
      const { data: all } = await svc.from('tenants').select('id, name').order('name');
      return NextResponse.json({ error: 'tenant_required', tenants: all ?? [] }, { status: 409 });
    }
  }

  const { data, error } = await supabase
    .from('period_locks_environment')
    .select('environment_id, period_month, locked, reason')
    .eq('tenant_id', tenantId)
    .eq('environment_id', environmentId)
    .order('period_month', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ locks: data ?? [] });
}

// POST { environment_id, period_month, locked, reason? }
export async function POST(req: NextRequest) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = getServiceSupabase();
  const body = await req.json().catch(() => ({}));
  const environment_id = (body?.environment_id as string | undefined)?.trim();
  const period_month = (body?.period_month as string | undefined)?.trim();
  const locked = !!body?.locked;
  const reason = (body?.reason as string | undefined) || null;
  if (!environment_id) return NextResponse.json({ error: 'environment_id_required' }, { status: 400 });
  if (!period_month) return NextResponse.json({ error: 'period_month_required' }, { status: 400 });

  let tenantId = user.tenant_id as string | undefined;
  if (!tenantId) {
    const svc = getServiceSupabase();
    const { data: tenants } = await svc.from('tenants').select('id').limit(2);
    if (tenants && tenants.length === 1) {
      tenantId = tenants[0].id;
      await svc.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
    } else {
      const { data: all } = await svc.from('tenants').select('id, name').order('name');
      return NextResponse.json({ error: 'tenant_required', tenants: all ?? [] }, { status: 409 });
    }
  }

  const { error } = await supabase
    .from('period_locks_environment')
    .upsert(
      { tenant_id: tenantId, environment_id, period_month, locked, reason },
      { onConflict: 'tenant_id,environment_id,period_month' }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

