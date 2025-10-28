"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function BackToDashboard() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('buttons');
  const locale = pathname?.split('/')[1] || 'pt-BR';

  // Don't show on dashboard itself
  if (pathname === `/${locale}/dashboard` || pathname === `/${locale}`) {
    return null;
  }

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--muted)]/40 hover:bg-[var(--muted)]/60 text-[var(--foreground)] transition-all duration-200 text-sm font-medium group"
      aria-label={t('back')}
    >
      <svg
        className="w-4 h-4 transition-transform group-hover:-translate-x-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span>{t('back')}</span>
    </button>
  );
}

