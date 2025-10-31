import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase();
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const name = body?.name as string | undefined;
  const code = body?.code as string | undefined;
  const update: any = {};
  if (name !== undefined) update.name = name;
  if (code !== undefined) update.code = code;
  const { error } = await supabase.from('vessels').update(update).eq('id', id).eq('tenant_id', user.tenant_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase();
  const { id } = await context.params;
  const { error } = await supabase.from('vessels').delete().eq('id', id).eq('tenant_id', user.tenant_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

