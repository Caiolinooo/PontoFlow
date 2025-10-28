import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

function firstDayOfMonth(isoDate: string): string {
  // Accepts 'YYYY-MM' or 'YYYY-MM-01' or full 'YYYY-MM-DD'
  const d = new Date(isoDate.length === 7 ? `${isoDate}-01` : isoDate);
  const fd = new Date(d.getFullYear(), d.getMonth(), 1);
  const y = fd.getFullYear();
  const m = `${fd.getMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}-01`;
}

export async function GET() {
  try {
    const user = await requireApiRole(['ADMIN']);
    const supabase = await getServerSupabase();

    // Resolve tenant automatically if there is exactly one; otherwise ask user to choose
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
      .from('period_locks')
      .select('id, tenant_id, period_month, locked, reason, updated_at, created_at')
      .eq('tenant_id', tenantId)
      .order('period_month', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ locks: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);

    // Resolve tenant automatically if there is exactly one; otherwise ask user to choose
    let tenantId = user.tenant_id as string | undefined;
    const svc = getServiceSupabase();
    if (!tenantId) {
      const { data: tenants } = await svc.from('tenants').select('id').limit(2);
      if (tenants && tenants.length === 1) {
        tenantId = tenants[0].id;
        await svc.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
      } else {
        const { data: all } = await svc.from('tenants').select('id, name').order('name');
        return NextResponse.json({ error: 'tenant_required', tenants: all ?? [] }, { status: 409 });
      }
    }

    const body = await req.json().catch(() => ({} as any));
    const raw = (body?.period_month as string) ?? '';
    const locked = Boolean(body?.locked);
    const reason = (body?.reason as string) ?? null;
    const month = firstDayOfMonth(raw);

    const supabase = await getServerSupabase();
    // Upsert lock for tenant+month
    const { data: existing } = await supabase
      .from('period_locks')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('period_month', month)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from('period_locks')
        .update({ locked, reason })
        .eq('id', existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      const { error } = await supabase
        .from('period_locks')
        .insert({ tenant_id: tenantId, period_month: month, locked, reason });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && (err.message === 'Unauthorized' || err.message === 'Forbidden')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

