import SignUpForm from "@/components/auth/SignUpForm";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { getUserFromToken } from "@/lib/auth/custom-auth";
import { branding } from "@/config/branding";
import LanguageSelector from "@/components/ui/LanguageSelector";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default async function SignUpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  // Check if user is already logged in
  const cookieStore = await cookies();
  const token = cookieStore.get('timesheet_session')?.value;
  const user = token ? await getUserFromToken(token) : null;

  if (user) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations('auth');
  const tApp = await getTranslations('app');
  const siteTitle = branding.siteTitle || tApp('title');

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <LanguageSelector />
        <ThemeToggle />
      </div>
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl shadow-2xl w-full max-w-2xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={branding.logoUrl} alt={branding.companyName} className="w-16 h-16 mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-[var(--foreground)] mb-2">{siteTitle}</h1>
          <p className="text-[var(--muted-foreground)]">{t('signUp.subtitle')}</p>
        </div>

        {/* Form */}
        <SignUpForm />

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            {t('signUp.hasAccount')}{' '}
            <a href={`/${locale}/auth/signin`} className="font-medium text-[var(--primary)] hover:opacity-90 transition-colors">
              {t('signUp.signInLink')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

