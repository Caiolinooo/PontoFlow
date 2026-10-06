import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { consumeSsoToken } from '@/lib/integration/v1/sso';

const SUPPORTED_LOCALES = ['pt-BR', 'en-GB'];

/**
 * GET /sso?token=… — consome token SSO de uso único (60s), seta o cookie de
 * sessão do TS e redireciona para a tela de ponto. Fora de /api para o browser
 * navegar direto (middleware só cobre / e rotas com locale).
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const fallback = NextResponse.redirect(new URL('/pt-BR/auth/signin?error=sso_invalid', req.url));
  if (!token) return fallback;

  try {
    const session = await consumeSsoToken(getServiceSupabase(), token);
    if (!session) return fallback;

    const locale = SUPPORTED_LOCALES.includes(session.locale) ? session.locale : 'pt-BR';
    const response = NextResponse.redirect(new URL(`/${locale}/employee/timesheets`, req.url));
    response.cookies.set('timesheet_session', session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias (mesmo padrão do signin)
      path: '/',
    });
    return response;
  } catch (e) {
    console.error('[sso] consume error:', e);
    return fallback;
  }
}
