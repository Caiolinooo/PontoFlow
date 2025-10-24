import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

// GET /api/admin/periods/groups?group_id=... -> list locks for a group
export async function GET(req: NextRequest) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase();
  const url = new URL(req.url);
  const groupId = (url.searchParams.get('group_id') || '').trim();
  if (!groupId) return NextResponse.json({ error: 'group_id_required' }, { status: 400 });

  let tenantId = user.tenant_id as string | undefined;
  if (!tenantId) {
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY ? getServiceSupabase() : await getServerSupabase();
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
    .from('period_locks_group')
    .select('group_id, period_month, locked, reason')
    .eq('tenant_id', tenantId)
    .eq('group_id', groupId)
    .order('period_month', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ locks: data ?? [] });
}

// POST { group_id, period_month, locked, reason? }
export async function POST(req: NextRequest) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase();
  const body = await req.json().catch(() => ({}));
  const group_id = (body?.group_id as string | undefined)?.trim();
  const period_month = (body?.period_month as string | undefined)?.trim();
  const locked = !!body?.locked;
  const reason = (body?.reason as string | undefined) || null;
  if (!group_id) return NextResponse.json({ error: 'group_id_required' }, { status: 400 });
  if (!period_month) return NextResponse.json({ error: 'period_month_required' }, { status: 400 });

  let tenantId = user.tenant_id as string | undefined;
  if (!tenantId) {
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY ? getServiceSupabase() : await getServerSupabase();
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
    .from('period_locks_group')
    .upsert(
      { tenant_id: tenantId, group_id, period_month, locked, reason },
      { onConflict: 'tenant_id,group_id,period_month' }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

