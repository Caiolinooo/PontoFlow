import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/service';
import { getServerSupabase } from '@/lib/supabase/server';
import { createHmac, timingSafeEqual } from 'node:crypto';

const PayloadSchema = z.object({
  action: z.enum(['upsert', 'disable']),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email().optional(),
    tenant_id: z.string().uuid().optional(),
    // optional room for future fields like name, roles, etc.
  })
});

function verifyHmac(rawBody: string, headerSig: string | null, secret: string) {
  if (!headerSig) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  // allow either raw hex or prefixed format 'sha256=...'
  const provided = headerSig.startsWith('sha256=') ? headerSig.slice(7) : headerSig;
  try {
    return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.ADMIN_SYNC_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'sync_disabled' }, { status: 403 });
    }

    const raw = await req.text();
    const sig = req.headers.get('x-sync-signature');
    if (!verifyHmac(raw, sig, secret)) {
      return NextResponse.json({ error: 'invalid_signature' }, { status: 403 });
    }

    const parsed = PayloadSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
    }

    const { action, user } = parsed.data;
    const svc = getServiceSupabase();

    if (action === 'upsert') {
      // Build minimal upsert for users_unified to avoid schema mismatches
      const upsert: Record<string, any> = { id: user.id };
      if (user.email) upsert.email = user.email;
      if (user.tenant_id) upsert.tenant_id = user.tenant_id;

      const { error } = await svc.from('users_unified').upsert(upsert, { onConflict: 'id' });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      // Optional: verify tenant exists when setting tenant_id
      if (user.tenant_id) {
        const { data: t } = await svc.from('tenants').select('id').eq('id', user.tenant_id).maybeSingle();
        if (!t) return NextResponse.json({ error: 'invalid_tenant' }, { status: 400 });
      }

      return NextResponse.json({ ok: true });
    }

    if (action === 'disable') {
      // Cautious update: only attempt to set a common flag if present.
      // If your schema has a specific column (e.g., `active` or `disabled_at`),
      // adjust here accordingly. For now, we no-op to avoid breaking unknown schema.
      // const { error } = await svc.from('users_unified').update({ active: false }).eq('id', user.id);
      // if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, note: 'disable_noop_configure_schema' });
    }

    return NextResponse.json({ error: 'unsupported_action' }, { status: 400 });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

