import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

/**
 * Admin Tenants: PATCH/DELETE
 * PATCH /api/admin/tenants/[id] { name?, slug?, description? }
 * DELETE /api/admin/tenants/[id]
 */

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireApiRole(['ADMIN']);
    const { id } = await context.params;
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? getServiceSupabase() : await getServerSupabase();

    const json = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = {};
    if (typeof json.name === 'string') update.name = json.name.trim();
    if (typeof json.slug === 'string') {
      const slug = String(json.slug)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-|-$/g, '');
      update.slug = slug;
    }
    if (typeof json.description === 'string' || json.description === null) update.description = json.description;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'no_fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tenants')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, tenant: data });
  } catch (err: any) {
    if (err instanceof Error && (err.message === 'Unauthorized' || err.message === 'Forbidden')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('PATCH tenant error:', err);
    return NextResponse.json({ error: err?.message ?? 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireApiRole(['ADMIN']);
    const { id } = await context.params;
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? getServiceSupabase() : await getServerSupabase();

    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof Error && (err.message === 'Unauthorized' || err.message === 'Forbidden')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('DELETE tenant error:', err);
    return NextResponse.json({ error: err?.message ?? 'internal_error' }, { status: 500 });
  }
}

