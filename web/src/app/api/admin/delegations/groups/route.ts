import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(120),
  environment_id: z.string().uuid().nullable().optional()
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);
    const supabase = await getServerSupabase();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    // Resolve tenant: if user has none and there is exactly one tenant, adopt it and persist for the user
    let tenantId = user.tenant_id as string | undefined;
    if (!tenantId) {
      const svc = getServiceSupabase();
      const { data: tenants } = await svc.from('tenants').select('id').limit(2);
      if (tenants && tenants.length === 1) {
        tenantId = tenants[0].id;
        // Persist on service to avoid RLS issues
        await svc.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
      } else {
        const { data: all } = await svc.from('tenants').select('id, name').order('name');
        return NextResponse.json({ error: 'tenant_required', tenants: all ?? [] }, { status: 409 });
      }
    }

    let query = supabase
      .from('groups')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    if (q) query = query.ilike('name', `%${q}%`);

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ items: data ?? [] });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);
    // Use service client to bypass RLS (we handle authorization manually)
    const supabase = getServiceSupabase();

    // Resolve tenant as in GET
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

    const body = await req.json().catch(() => ({}));
    const parsed = CreateGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
    }

    const insert = {
      tenant_id: tenantId,
      name: parsed.data.name,
      environment_id: parsed.data.environment_id ?? null
    } as const;

    // Defensive: verify tenant exists to avoid FK errors with clearer message
    let { data: tenantRow } = await supabase.from('tenants').select('id').eq('id', tenantId).maybeSingle();
    if (!tenantRow) {
      const { data: tenants } = await supabase.from('tenants').select('id').limit(2);
      if (tenants && tenants.length === 1) {
        tenantId = tenants[0].id as string;
        await supabase.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
        ({ data: tenantRow } = await supabase.from('tenants').select('id').eq('id', tenantId).maybeSingle());
      } else {
        const { data: all } = await supabase.from('tenants').select('id, name').order('name');
        return NextResponse.json({ error: 'tenant_required', tenants: all ?? [] }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from('groups')
      .insert(insert)
      .select('*')
      .single();

    if (error || !data) {
      console.error('Failed to create group:', error);
      return NextResponse.json({ error: error?.message ?? 'insert_failed' }, { status: 400 });
    }

    return NextResponse.json({ item: data });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    console.error('POST /api/admin/delegations/groups error:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

