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
    <select
      className="border rounded px-2 py-1 text-sm"
      onChange={onChange}
      value={current}
      aria-label="Select language"
    >
      <option value="pt-BR">Português (BR)</option>
      <option value="en-GB">English (UK)</option>
    </select>
  );
}

