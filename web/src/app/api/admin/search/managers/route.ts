import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

// GET /api/admin/search/managers?q=...&limit=20
// Agora busca por funcionários (employees) e usa profile_id como manager_id
export async function GET(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);

    // Resolver tenant (auto-heal se houver apenas um)
    let tenantId = user.tenant_id as string | undefined;
    const svc = getServiceSupabase();
    if (!tenantId) {
      const { data: tenants } = await svc.from('tenants').select('id').limit(2);
      if (tenants && tenants.length === 1) {
        tenantId = tenants[0].id;
        await svc.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
      } else {
        return NextResponse.json({ error: 'tenant_required' }, { status: 409 });
      }
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const limitRaw = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.max(1, Math.min(isNaN(limitRaw) ? 20 : limitRaw, 100));
    const offsetRaw = parseInt(searchParams.get('offset') || '0', 10);
    const offset = Math.max(0, isNaN(offsetRaw) ? 0 : offsetRaw);

    const svcRead = getServiceSupabase();

    if (q) {
      // 1) Buscar perfis pelo termo
      const { data: profs, error: pErr } = await svcRead
        .from('profiles')
        .select('user_id, display_name, email')
        .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(200);
      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });
      const ids = (profs ?? []).map(p => p.user_id);

      // 2) Encontrar employees do tenant para esses perfis
      const { data: emps, error: eErr } = await svcRead
        .from('employees')
        .select('id, profile_id')
        .eq('tenant_id', tenantId)
        .in('profile_id', ids)
        .range(offset, offset + limit - 1);
      if (eErr) return NextResponse.json({ error: eErr.message }, { status: 400 });

      const items = (emps ?? []).map(e => {
        const p = (profs ?? []).find(pr => pr.user_id === e.profile_id);
        const label = (p as any)?.display_name ?? p?.email ?? e.profile_id;
        return { id: e.profile_id, label, email: p?.email ?? null };
      });
      return NextResponse.json({ items });
    }

    // Sem q: listar alguns employees do tenant
    const { data: emps, error } = await svcRead
      .from('employees')
      .select('id, profile_id')
      .eq('tenant_id', tenantId)
      .range(offset, offset + limit - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const profileIds = (emps ?? []).map(e => e.profile_id);
    const { data: profsAll } = await svcRead
      .from('profiles')
      .select('user_id, display_name, email')
      .in('user_id', profileIds);

    const items = (emps ?? []).map(e => {
      const p = (profsAll ?? []).find(pr => pr.user_id === e.profile_id);
      const label = (p as any)?.display_name ?? p?.email ?? e.profile_id;
      return { id: e.profile_id, label, email: p?.email ?? null };
    });

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
