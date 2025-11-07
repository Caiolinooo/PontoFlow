import type {Metadata} from 'next';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import { Inter, Roboto_Mono } from "next/font/google";
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import '../globals.css';
import { ServiceWorkerRegistrar } from '../../components/ServiceWorkerRegistrar';
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});


export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const { getTranslations } = await import('next-intl/server');
  const { branding } = await import('@/config/branding');
  const tApp = await getTranslations({ locale, namespace: 'app' });
  return {
    title: branding.siteTitle || tApp('title'),
    description: tApp('title'),
    icons: {
      icon: branding.logoUrl || '/brand/logo.svg',
      shortcut: branding.logoUrl || '/brand/logo.svg',
      apple: branding.logoUrl || '/brand/logo.svg'
    },
    manifest: '/manifest.json'
  };
}

export const dynamic = 'force-dynamic';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  const messages = await getMessages({locale});
  // Read theme cookie server-side to avoid flash on first paint
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('theme')?.value;
  let isDark = themeCookie === 'dark';

  // If no cookie, try reading profiles.ui_theme (cross-device)
  if (themeCookie === undefined) {
    try {
      const { getApiUser } = await import('@/lib/auth/server');
      const user = await getApiUser();
      if (user) {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data: prof } = await supabase
          .from('profiles')
          .select('ui_theme')
          .eq('user_id', user.id)
          .maybeSingle();
        if (prof?.ui_theme === 'dark') isDark = true;
        if (prof?.ui_theme === 'light') isDark = false;
      }
    } catch {}
  }

  return (
    <html lang={locale} className={isDark ? 'dark' : ''} suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} ${robotoMono.variable} antialiased bg-[var(--background)] text-[var(--foreground)]`}>
        {/* Inline no-FOUC script: only runs when cookie is missing, uses localStorage or prefers-color-scheme */}
        <script dangerouslySetInnerHTML={{__html: `(() => { try { const c = document.cookie.match(/(?:^|; )theme=([^;]+)/)?.[1]; if (c) return; var t = localStorage.getItem('theme'); if (!t) { t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } if (t === 'dark') document.documentElement.classList.add('dark'); } catch(_){} })();`}} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ServiceWorkerRegistrar />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}