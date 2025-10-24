import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const user = await requireApiRole(['ADMIN']);
  const { userId } = await context.params;

  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from('user_permissions')
    .select('id,module,permission,resource')
    .eq('tenant_id', user.tenant_id as string)
    .eq('user_id', userId);

  return NextResponse.json({ permissions: data ?? [] });
}

export async function POST(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const user = await requireApiRole(['ADMIN']);
  const { userId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const module = (body?.module as string)?.trim();
  const permission = (body?.permission as string)?.trim();
  const resource = (body?.resource as string | undefined) ?? null;

  if (!module || !permission) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from('user_permissions')
    .insert({ tenant_id: user.tenant_id, user_id: userId, module, permission, resource });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const user = await requireApiRole(['ADMIN']);
  const { userId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const module = (body?.module as string)?.trim();
  const permission = (body?.permission as string)?.trim();
  const resource = (body?.resource as string | undefined) ?? null;

  if (!module || !permission) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  const query = supabase
    .from('user_permissions')
    .delete()
    .eq('tenant_id', user.tenant_id as string)
    .eq('user_id', userId)
    .eq('module', module)
    .eq('permission', permission);

  if (resource === null) {
    const { error } = await query.is('resource', null);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await query.eq('resource', resource);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

