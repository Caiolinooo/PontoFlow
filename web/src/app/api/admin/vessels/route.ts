import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export async function GET(req: NextRequest) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase();

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();

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

  let query = supabase
    .from('vessels')
    .select('id, name, code, created_at')
    .eq('tenant_id', tenantId)
    .order('name');

  if (q) query = query.ilike('name', `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ vessels: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase();
  const body = await req.json().catch(() => ({}));
  const name = (body?.name as string)?.trim();
  const code = (body?.code as string)?.trim() || null;
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 });

  // Resolve tenant automatically if there is exactly one
  let tenantId = user.tenant_id as string | undefined;
  if (!tenantId) {
    const { data: tenants } = await supabase.from('tenants').select('id').limit(2);
    if (tenants && tenants.length === 1) {
      tenantId = tenants[0].id;
      await supabase.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
    } else {
      const { data: all } = await supabase.from('tenants').select('id, name').order('name');
      return NextResponse.json({ error: 'tenant_required', tenants: all ?? [] }, { status: 409 });
    }
  }

  // Optional defensive: verify tenant exists (helps surface FK errors clearly)
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

  const { error } = await supabase.from('vessels').insert({ tenant_id: tenantId, name, code });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

