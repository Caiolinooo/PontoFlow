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
  const user = token ? await getUserFromToken(token) : null;

  if (user) {
    redirect(redirectParam || `/${locale}/dashboard`);
  }

  const redirectTo = redirectParam || `/${locale}/dashboard`;
  const t = await getTranslations('auth');
  const tApp = await getTranslations('app');
  const siteTitle = branding.siteTitle || tApp('title');

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <LanguageSelector />
        <ThemeToggle />
      </div>
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={branding.logoUrl} alt={branding.companyName} className="w-16 h-16 mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-[var(--foreground)] mb-2">{siteTitle}</h1>
          <p className="text-[var(--muted-foreground)]">{t('signIn.subtitle')}</p>
        </div>

        <SignInForm redirectTo={redirectTo} />

        <div className="mt-6 text-center text-sm text-[var(--muted-foreground)] space-y-2">
          <div>
            <span>{t('signIn.noAccount')} </span>
            <a className="text-[var(--primary)] hover:opacity-90 font-medium transition-colors" href={`/${locale}/auth/signup`}>
              {t('signIn.signUp')}
            </a>
          </div>
          <div>
            <a className="text-[var(--primary)] hover:opacity-90 font-medium transition-colors" href={`/${locale}/auth/reset`}>
              {t('signIn.forgotPassword')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

