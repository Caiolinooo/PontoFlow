import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = getServiceSupabase();
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const update: any = {};
  if (body?.name !== undefined) update.name = body.name;
  if (body?.slug !== undefined) update.slug = body.slug;
  const { error } = await supabase.from('environments').update(update).eq('id', id).eq('tenant_id', user.tenant_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase();
  const { id } = await context.params;
  const { error } = await supabase.from('environments').delete().eq('id', id).eq('tenant_id', user.tenant_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

