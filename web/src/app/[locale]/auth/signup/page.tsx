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

  const t = await getTranslations({ locale, namespace: 'auth' });
  const tApp = await getTranslations({ locale, namespace: 'app' });
  const siteTitle = branding.siteTitle || tApp('title');

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <LanguageSelector />
        <ThemeToggle />
      </div>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 my-8">
        {/* Logo */}
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={branding.logoUrl} alt={branding.companyName} className="w-14 h-14 mx-auto mb-3 object-contain" />
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-1">{siteTitle}</h1>
          <p className="text-[var(--muted-foreground)] text-sm">{t('signUp.subtitle')}</p>
        </div>

        {/* Form */}
        <SignUpForm />

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-[var(--border)] text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            {t('signUp.hasAccount')}{' '}
            <a href={`/${locale}/auth/signin`} className="font-semibold text-[var(--primary)] hover:underline transition-all">
              {t('signUp.signInLink')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

