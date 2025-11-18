import SignInForm from "@/components/auth/SignInForm";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { getUserFromToken } from "@/lib/auth/custom-auth";
import { branding } from "@/config/branding";
import LanguageSelector from "@/components/ui/LanguageSelector";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default async function SignInPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { locale } = await params;
  const { redirect: redirectParam } = await searchParams;

  // Check if user is already logged in
  const cookieStore = await cookies();
  const token = cookieStore.get('timesheet_session')?.value;

  console.log('[SIGNIN_PAGE] Checking existing session:', {
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
  });

  const user = token ? await getUserFromToken(token) : null;

  if (user) {
    console.log('[SIGNIN_PAGE] User already logged in, redirecting to:', redirectParam || `/${locale}/dashboard`);
    redirect(redirectParam || `/${locale}/dashboard`);
  }

  console.log('[SIGNIN_PAGE] No existing session, showing login form');

  const redirectTo = redirectParam || `/${locale}/dashboard`;
  const t = await getTranslations({ locale, namespace: 'auth' });
  const tApp = await getTranslations({ locale, namespace: 'app' });
  const siteTitle = branding.siteTitle || tApp('title');

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <LanguageSelector />
        <ThemeToggle />
      </div>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md p-8 sm:p-10">
        {/* Logo */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={branding.logoUrl} alt={branding.companyName} className="w-16 h-16 mx-auto mb-3 object-contain drop-shadow-lg" />
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-1">{siteTitle}</h1>
          <p className="text-[var(--muted-foreground)] text-sm">{t('signIn.subtitle')}</p>
        </div>

        <SignInForm redirectTo={redirectTo} />

        <div className="mt-8 pt-6 border-t border-[var(--border)] text-center space-y-3">
          <div className="text-sm text-[var(--muted-foreground)]">
            <span>{t('signIn.noAccount')} </span>
            <a className="text-[var(--primary)] hover:underline font-semibold transition-all" href={`/${locale}/auth/signup`}>
              {t('signIn.signUp')}
            </a>
          </div>
          <div>
            <a className="text-sm text-[var(--primary)] hover:underline font-medium transition-all inline-flex items-center gap-1" href={`/${locale}/auth/reset`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              {t('signIn.forgotPassword')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

