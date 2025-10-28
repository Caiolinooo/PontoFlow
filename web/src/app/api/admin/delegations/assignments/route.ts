import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

const AssignSchema = z.object({
  manager_id: z.string().uuid(),
  group_id: z.string().uuid()
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);
    let tenantId = user.tenant_id as string | undefined;
    if (!tenantId) {
      const svc = getServiceSupabase();
      const { data: tenants } = await svc.from('tenants').select('id').limit(2);
      if (tenants && tenants.length === 1) {
        tenantId = tenants[0].id;
        await svc.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
      } else {
        return NextResponse.json({ error: 'missing_tenant' }, { status: 400 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const parsed = AssignSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

    // Ensure tenantId is valid; auto-heal if single tenant exists
    const svc = getServiceSupabase();
    let { data: tenantRow } = await svc.from('tenants').select('id').eq('id', tenantId).maybeSingle();
    if (!tenantRow) {
      const { data: tenants } = await svc.from('tenants').select('id').limit(2);
      if (tenants && tenants.length === 1) {
        tenantId = tenants[0].id as string;
        await svc.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
      } else {
        return NextResponse.json({ error: 'invalid_tenant' }, { status: 400 });
      }
    }

    const svcRead = getServiceSupabase();
    // Ensure group belongs to same tenant (read with service to bypass RLS)
    const { data: grp } = await svcRead.from('groups').select('tenant_id').eq('id', parsed.data.group_id).single();
    if (!grp) return NextResponse.json({ error: 'group_not_found' }, { status: 404 });
    if (grp.tenant_id !== tenantId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const svcWrite = getServiceSupabase();
    const { error } = await svcWrite
      .from('manager_group_assignments')
      .insert({ manager_id: parsed.data.manager_id, group_id: parsed.data.group_id });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);
    let tenantId = user.tenant_id as string | undefined;
    if (!tenantId) {
      const svc = getServiceSupabase();
      const { data: tenants } = await svc.from('tenants').select('id').limit(2);
      if (tenants && tenants.length === 1) {
        tenantId = tenants[0].id;
        await svc.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
      } else {
        return NextResponse.json({ error: 'missing_tenant' }, { status: 400 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const parsed = AssignSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

    // Ensure tenantId is valid; auto-heal if single tenant exists
    const svc = getServiceSupabase();
    let { data: tenantRow } = await svc.from('tenants').select('id').eq('id', tenantId).maybeSingle();
    if (!tenantRow) {
      const { data: tenants } = await svc.from('tenants').select('id').limit(2);
      if (tenants && tenants.length === 1) {
        tenantId = tenants[0].id as string;
        await svc.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
      } else {
        return NextResponse.json({ error: 'invalid_tenant' }, { status: 400 });
      }
    }

    const svcRead = getServiceSupabase();
    // Ensure group belongs to same tenant (read with service to bypass RLS)
    const { data: grp } = await svcRead.from('groups').select('tenant_id').eq('id', parsed.data.group_id).single();
    if (!grp) return NextResponse.json({ error: 'group_not_found' }, { status: 404 });
    if (grp.tenant_id !== tenantId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const svcWrite = getServiceSupabase();
    const { error } = await svcWrite
      .from('manager_group_assignments')
      .delete()
      .eq('manager_id', parsed.data.manager_id)
      .eq('group_id', parsed.data.group_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

