import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export async function GET() {
  const user = await requireApiRole(['ADMIN']);
  const svc = getServiceSupabase();

  let tenantId = user.tenant_id as string | null;
  if (!tenantId) {
    const { data: tenants } = await svc.from('tenants').select('id, name').order('name');
    return NextResponse.json({ error: 'tenant_required', tenants: tenants ?? [] }, { status: 409 });
  }

  // members (employees in current tenant)
  const { data: members } = await svc.from('employees').select('id, profile_id').eq('tenant_id', tenantId);
  const { data: candidates } = await svc.from('employees').select('id, profile_id').is('tenant_id', null);

  const profileIds = Array.from(new Set([...(members?.map(m => m.profile_id) || []), ...(candidates?.map(c => c.profile_id) || [])].filter(Boolean)));
  const profilesMap: Record<string, { display_name: string | null; email: string | null }> = {};
  if (profileIds.length) {
    const { data: profiles } = await svc.from('profiles').select('user_id, display_name, email').in('user_id', profileIds);
    for (const p of profiles || []) profilesMap[p.user_id] = { display_name: p.display_name ?? null, email: p.email ?? null };
  }

  const fmt = (arr?: any[]) => (arr || []).map((e) => {
    const name = profilesMap[e.profile_id]?.display_name || profilesMap[e.profile_id]?.email || 'Sem nome';
    return {
      id: e.id as string,
      label: `${name} (${e.id})`,
    };
  });

  return NextResponse.json({ tenant_id: tenantId, members: fmt(members ?? []), candidates: fmt(candidates ?? []) });
}

export async function PATCH(req: NextRequest) {
  const user = await requireApiRole(['ADMIN']);
  const svc = getServiceSupabase();
  const tenantId = user.tenant_id as string | null;
  if (!tenantId) {
    const { data: tenants } = await svc.from('tenants').select('id, name').order('name');
    return NextResponse.json({ error: 'tenant_required', tenants: tenants ?? [] }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const add: string[] = Array.isArray(body?.add) ? body.add : [];
  const remove: string[] = Array.isArray(body?.remove) ? body.remove : [];

  // apply in small batches
  let addCount = 0, removeCount = 0;
  if (add.length) {
    const { error, data } = await svc.from('employees').update({ tenant_id: tenantId }).in('id', add).select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    addCount = data?.length ?? add.length;
  }
  if (remove.length) {
    const { error, data } = await svc.from('employees').update({ tenant_id: null }).in('id', remove).eq('tenant_id', tenantId).select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    removeCount = data?.length ?? remove.length;
  }

  return NextResponse.json({ ok: true, addCount, removeCount });
}

