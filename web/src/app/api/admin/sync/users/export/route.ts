import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { createHmac, timingSafeEqual } from 'node:crypto';

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

    const svc = getServiceSupabase();
    // Full table export: return everything from users_unified
    const { data, error } = await svc.from('users_unified').select('*');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ users: data ?? [] });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

