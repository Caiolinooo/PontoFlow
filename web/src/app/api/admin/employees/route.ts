import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export async function GET() {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase();

  // Resolve tenant with user choice when ambiguous
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

  // Ensure tenantId exists; if not and ambiguous, ask UI to choose
  let { data: tenantRow } = await svc.from('tenants').select('id').eq('id', tenantId).maybeSingle();
  if (!tenantRow) {
    const { data: tenants } = await svc.from('tenants').select('id').limit(2);
    if (tenants && tenants.length === 1) {
      tenantId = tenants[0].id as string;
      await svc.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
    } else {
      const { data: all } = await svc.from('tenants').select('id, name').order('name');
      return NextResponse.json({ error: 'tenant_required', tenants: all ?? [] }, { status: 409 });
    }
  }

  const { data, error } = await svc
    .from('employees')
    .select('id, profile_id, vessel_id, cargo, centro_custo, name')
    .eq('tenant_id', tenantId)
    .order('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Enrich with profile display_name/email
  const profileIds = Array.from(new Set((data ?? []).map(e => e.profile_id).filter(Boolean)));
  let byProfile: Record<string, { display_name: string | null; email: string | null }> = {};
  if (profileIds.length) {
    const { data: profs } = await svc
      .from('profiles')
      .select('user_id, display_name, email')
      .in('user_id', profileIds);
    for (const p of profs || []) {
      byProfile[p.user_id as string] = { display_name: (p as any).display_name ?? null, email: p.email ?? null };
    }
  }

  // Load groups per employee
  const empIds = Array.from(new Set((data ?? []).map(e => e.id)));
  let groupsByEmp: Record<string, Array<{ id: string; name: string }>> = {};
  let managersByGroup: Record<string, Array<{ id: string; label: string }>> = {};
  if (empIds.length) {
    const { data: egm } = await svc
      .from('employee_group_members')
      .select('employee_id, group_id')
      .in('employee_id', empIds);
    const groupIds = Array.from(new Set((egm ?? []).map((r: any) => r.group_id)));
    let byGroup: Record<string, { id: string; name: string }> = {};
    if (groupIds.length) {
      const { data: gs } = await svc
        .from('groups')
        .select('id, name, tenant_id')
        .in('id', groupIds)
        .eq('tenant_id', tenantId);
      for (const g of gs || []) byGroup[g.id as string] = { id: g.id as string, name: g.name as string } as any;

      // Managers assigned per group
      const { data: mga } = await svc
        .from('manager_group_assignments')
        .select('manager_id, group_id')
        .in('group_id', groupIds);
      const mgrIds = Array.from(new Set((mga ?? []).map((r: any) => r.manager_id)));
      let mgrLabel: Record<string, string> = {};
      if (mgrIds.length) {
        const { data: mgrs } = await svc
          .from('users_unified')
          .select('id, name, first_name, last_name, email')
          .in('id', mgrIds);
        for (const u of mgrs || []) {
          const label = (u as any).name || `${(u as any).first_name ?? ''} ${(u as any).last_name ?? ''}`.trim() || (u as any).email || (u as any).id;
          mgrLabel[(u as any).id] = label;
        }
      }
      for (const r of mga || []) {
        const gid = r.group_id as string; const mid = r.manager_id as string;
        if (!managersByGroup[gid]) managersByGroup[gid] = [];
        managersByGroup[gid].push({ id: mid, label: mgrLabel[mid] || mid });
      }
    }
    for (const r of egm || []) {
      const g = byGroup[r.group_id as string];
      if (!g) continue;
      const k = r.employee_id as string;
      if (!groupsByEmp[k]) groupsByEmp[k] = [];
      groupsByEmp[k].push(g);
    }
  }

  const enriched = (data ?? []).map(e => {
    const managersSet: Record<string, { id: string; label: string }> = {};
    for (const g of (groupsByEmp[e.id] || [])) {
      for (const m of (managersByGroup[g.id] || [])) managersSet[m.id] = m;
    }
    return {
      ...e,
      display_name: byProfile[e.profile_id]?.display_name ?? null,
      email: byProfile[e.profile_id]?.email ?? null,
      groups: groupsByEmp[e.id] ?? [],
      managers: Object.values(managersSet)
    };
  });

  return NextResponse.json({ employees: enriched });
}

export async function POST(req: NextRequest) {
  const user = await requireApiRole(['ADMIN']);
  // Use service client to bypass RLS for admin operations
  const supabase = getServiceSupabase();
  const body = await req.json().catch(() => ({}));
  const profile_id = body?.profile_id as string | undefined;
  const vessel_id = body?.vessel_id as string | null | undefined;
  const cargo = (body?.cargo as string | undefined) || null;
  const centro_custo = (body?.centro_custo as string | undefined) || null;
  if (!profile_id) return NextResponse.json({ error: 'profile_id_required' }, { status: 400 });

  // Resolve tenant with option to choose
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

  // Validate tenant existence defensively
  let { data: tenantRow } = await svc.from('tenants').select('id').eq('id', tenantId).maybeSingle();
  if (!tenantRow) {
    const { data: tenants } = await svc.from('tenants').select('id').limit(2);
    if (tenants && tenants.length === 1) {
      tenantId = tenants[0].id as string;
      await svc.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
    } else {
      const { data: all } = await svc.from('tenants').select('id, name').order('name');
      return NextResponse.json({ error: 'tenant_required', tenants: all ?? [] }, { status: 409 });
    }
  }

  // Ensure a profile row exists for this profile_id (auto-create if missing)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('user_id, display_name, email')
    .eq('user_id', profile_id)
    .maybeSingle();

  let empName: string | null = existingProfile?.display_name ?? null;

  if (!existingProfile) {
    const { data: u } = await supabase
      .from('users_unified')
      .select('id, first_name, last_name, email, name')
      .eq('id', profile_id)
      .maybeSingle();
    const display_name = (u?.name as string | undefined)
      || ([u?.first_name, u?.last_name].filter(Boolean).join(' ').trim() || undefined)
      || (u?.email as string | undefined)
      || null;
    await supabase.from('profiles').insert({ user_id: profile_id, display_name, email: (u?.email as string | undefined) || null });
    empName = display_name;
  }

  if (!empName) {
    // Fallback: read profile again or use email/id
    const { data: p } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('user_id', profile_id)
      .maybeSingle();
    empName = p?.display_name || p?.email || profile_id;
  }

  const { error } = await supabase.from('employees').insert({ tenant_id: tenantId, profile_id, name: empName, vessel_id: vessel_id ?? null, cargo, centro_custo });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

