import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export async function GET() {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase();

  // Resolve tenant automatically if there is exactly one
  let tenantId = user.tenant_id as string | undefined;
  if (!tenantId) {
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY ? getServiceSupabase() : await getServerSupabase();
    const { data: tenants } = await svc.from('tenants').select('id').limit(2);
    if (tenants && tenants.length === 1) {
      tenantId = tenants[0].id;
      await svc.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
    } else {
      return NextResponse.json({ error: 'missing_tenant' }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from('environments')
    .select('id, name, slug, created_at')
    .eq('tenant_id', tenantId)
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ environments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase();
  const body = await req.json().catch(() => ({}));
  const name = (body?.name as string)?.trim();
  const slug = (body?.slug as string)?.trim();
  if (!name || !slug) return NextResponse.json({ error: 'name_and_slug_required' }, { status: 400 });

  // Resolve tenant automatically if there is exactly one
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

  // Defensive: ensure tenant exists to avoid FK violations with clearer message
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY ? getServiceSupabase() : await getServerSupabase();
  let { data: tenantRow } = await svc.from('tenants').select('id').eq('id', tenantId).maybeSingle();
  if (!tenantRow) {
    const { data: tenants } = await svc.from('tenants').select('id').limit(2);
    if (tenants && tenants.length === 1) {
      tenantId = tenants[0].id as string;
      await svc.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
      ({ data: tenantRow } = await svc.from('tenants').select('id').eq('id', tenantId).maybeSingle());
    } else {
      const { data: all } = await svc.from('tenants').select('id, name').order('name');
      return NextResponse.json({ error: 'tenant_required', tenants: all ?? [] }, { status: 409 });
    }
  }

  const { error } = await supabase.from('environments').insert({ tenant_id: tenantId, name, slug });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

