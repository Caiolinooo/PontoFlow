import { NextRequest, NextResponse } from 'next/server';

// Persist theme preference in a cookie for SSR (no-FOUC). Optional: later persist in DB.
export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => ({}));
  const theme = (body as { theme?: string })?.theme;
  if (theme !== 'light' && theme !== 'dark') {
    return NextResponse.json({ ok: false, error: 'invalid_theme' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true }, { status: 200 });
  // Set a long-lived cookie (1 year)
  res.cookies.set('theme', theme, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  // Best-effort: update user profile ui_theme if authenticated
  try {
    const { requireApiAuth } = await import('@/lib/auth/server');
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const user = await requireApiAuth();
    await supabase
      .from('profiles')
      .update({ ui_theme: theme })
      .eq('user_id', user.id);
  } catch {}

  return res;
}

