import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase/service';
import { createHmac, timingSafeEqual } from 'node:crypto';

const ImportSchema = z.object({
  users: z.array(z.record(z.string(), z.any())).min(1)
});

function verifyHmac(rawBody: string, headerSig: string | null, secret: string) {
  if (!headerSig) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
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
    if (!secret) return NextResponse.json({ error: 'sync_disabled' }, { status: 403 });

    const raw = await req.text();
    const sig = req.headers.get('x-sync-signature');
    if (!verifyHmac(raw, sig, secret)) return NextResponse.json({ error: 'invalid_signature' }, { status: 403 });

    const parsed = ImportSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

    const svc = getServiceSupabase();
    const batch = parsed.data.users;

    // Upsert full rows as provided; relies on identical schemas across projects
    const { error } = await svc.from('users_unified').upsert(batch, { onConflict: 'id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, count: batch.length });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

