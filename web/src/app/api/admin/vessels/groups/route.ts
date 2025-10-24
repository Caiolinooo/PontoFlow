import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

const CREATE_SQL = `
create table if not exists public.vessel_group_links (
  vessel_id uuid not null references public.vessels(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (vessel_id, group_id)
);
`;

function needsSetup(errMsg?: string | null) {
  if (!errMsg) return false;
  return errMsg.includes('relation') && errMsg.includes('vessel_group_links');
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);
    if (!user.tenant_id) return NextResponse.json({ error: 'missing_tenant' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const vessel_id = searchParams.get('vessel_id') || undefined;
    const group_id = searchParams.get('group_id') || undefined;

    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('vessel_group_links')
      .select('vessel_id, group_id')
      .match({ ...(vessel_id ? { vessel_id } : {}), ...(group_id ? { group_id } : {}) });

    if (error) {
      if (needsSetup(error.message)) {
        return NextResponse.json({ error: 'setup_required', sql: CREATE_SQL }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);
    if (!user.tenant_id) return NextResponse.json({ error: 'missing_tenant' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const vessel_id = (body?.vessel_id as string | undefined)?.trim();
    const group_id = (body?.group_id as string | undefined)?.trim();
    if (!vessel_id || !group_id) return NextResponse.json({ error: 'vessel_id_and_group_id_required' }, { status: 400 });

    const supabase = await getServerSupabase();
    // Optional: ensure vessel and group belong to tenant
    const [{ data: vessel }, { data: group }] = await Promise.all([
      supabase.from('vessels').select('tenant_id').eq('id', vessel_id).single(),
      supabase.from('groups').select('tenant_id').eq('id', group_id).single(),
    ]);
    if (!vessel || !group) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (vessel.tenant_id !== user.tenant_id || group.tenant_id !== user.tenant_id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const svc = getServiceSupabase();
    const { error } = await svc
      .from('vessel_group_links')
      .insert({ vessel_id, group_id });

    if (error) {
      if (needsSetup(error.message)) {
        return NextResponse.json({ error: 'setup_required', sql: CREATE_SQL }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);
    if (!user.tenant_id) return NextResponse.json({ error: 'missing_tenant' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const vessel_id = (body?.vessel_id as string | undefined)?.trim();
    const group_id = (body?.group_id as string | undefined)?.trim();
    if (!vessel_id || !group_id) return NextResponse.json({ error: 'vessel_id_and_group_id_required' }, { status: 400 });

    const svc = getServiceSupabase();
    const { error } = await svc
      .from('vessel_group_links')
      .delete()
      .match({ vessel_id, group_id });

    if (error) {
      if (needsSetup(error.message)) {
        return NextResponse.json({ error: 'setup_required', sql: CREATE_SQL }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

