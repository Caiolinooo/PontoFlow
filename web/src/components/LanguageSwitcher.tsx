"use client";
import {useRouter, usePathname} from 'next/navigation';
import {locales, AppLocale} from '@/i18n/config';

function replaceLocaleInPath(pathname: string, newLocale: AppLocale) {
  const parts = pathname.split('/');
  // pathname always starts with '' then maybe locale segment
  if (locales.includes(parts[1] as AppLocale)) {
    parts[1] = newLocale;
  } else {
    parts.splice(1, 0, newLocale);
  }
  return parts.join('/') || '/';
}

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname() || '/';

  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as AppLocale;
    const nextPath = replaceLocaleInPath(pathname, next);
    // Navigate first for instant feedback
    router.push(nextPath);
    // Persist preference if authenticated (best effort)
    try {
      await fetch('/api/profile/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next })
      });
    } catch {
      // ignore
    }
  };

  // Try to infer current locale from path
  const current = (() => {
    const seg = (pathname.split('/')[1] ?? '') as AppLocale;
    return locales.includes(seg) ? seg : 'pt-BR';
  })();

  return (
    <div className="relative inline-block">
      <select
        className="appearance-none bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 pr-8 text-sm text-[var(--surface-foreground)] hover:bg-[var(--surface)]/80 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent font-medium"
        onChange={onChange}
        value={current}
        aria-label="Selecionar idioma"
      >
        <option value="pt-BR">🇧🇷 PT</option>
        <option value="en-GB">🇬🇧 EN</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--surface-foreground)] opacity-60">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

