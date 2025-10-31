import {NextRequest, NextResponse} from 'next/server';
import { getApiUser } from '@/lib/auth/server';
import { createClient } from '@supabase/supabase-js';

const allowed = new Set(['pt-BR', 'en-GB']);

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => ({}));
  const locale = (body as {locale?: string})?.locale;
  if (!locale || !allowed.has(locale)) {
    return NextResponse.json({ok: false, error: 'invalid_locale'}, {status: 400});
  }

  const user = await getApiUser();
  if (!user) {
    // Not authenticated — nothing to persist, but not an error for UX
    return NextResponse.json({ok: true, persisted: false}, {status: 200});
  }

  // Best-effort persist in users_unified (fallback to no-op on error)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { error } = await supabase
    .from('users_unified')
    .update({ locale })
    .eq('id', user.id);

  if (error) {
    // Do not fail UX if persistence fails
    return NextResponse.json({ok: true, persisted: false}, {status: 200});
  }

  return NextResponse.json({ok: true, persisted: true}, {status: 200});
}

