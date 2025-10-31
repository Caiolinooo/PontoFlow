import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getApiUser } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { getServerSupabase } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { theme } = await req.json();
    if (!['light', 'dark', 'system'].includes(theme)) {
      return NextResponse.json({ error: 'invalid_theme' }, { status: 400 });
    }

    // Always set cookie for immediate SSR use
    const cookieStore = await cookies();
    cookieStore.set('theme', theme, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });

    // If logged in, persist in profiles.ui_theme (best-effort)
    const user = await getApiUser();
    if (user) {
      try {
        const useService = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = useService ? getServiceSupabase() : await getServerSupabase();
        // theme === 'system' clears the explicit preference
        const uiTheme = theme === 'system' ? null : theme;
        await supabase.from('profiles').update({ ui_theme: uiTheme }).eq('user_id', user.id);
      } catch {}
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
}

