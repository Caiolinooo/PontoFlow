import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase();
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const update: any = {};
  if (body?.vessel_id !== undefined) update.vessel_id = body.vessel_id;
  if (body?.cargo !== undefined) update.cargo = body.cargo;
  if (body?.centro_custo !== undefined) update.centro_custo = body.centro_custo;
  const { error } = await supabase.from('employees').update(update).eq('id', id).eq('tenant_id', user.tenant_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase();
  const { id } = await context.params;
  const { error } = await supabase.from('employees').delete().eq('id', id).eq('tenant_id', user.tenant_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

