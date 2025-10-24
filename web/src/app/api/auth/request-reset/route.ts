import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Request a password reset link
 * This endpoint always returns 200 to avoid leaking user existence.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    // Best-effort: check if user exists (no-op on errors). Do not reveal existence in response.
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.from('users_unified').select('id').eq('email', email).single();
      // In a full implementation we would generate a token, persist, and send an email here.
    } catch {}

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

