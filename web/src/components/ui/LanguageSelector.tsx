"use client";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";

const locales = [
  { code: "pt-BR", label: "Português (BR)" },
  { code: "en-GB", label: "English (UK)" },
];

export default function LanguageSelector({ compact = true }: { compact?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as (typeof locales)[number]["code"];
    router.replace(pathname, { locale: next });
  }

  return (
    <div className="inline-flex items-center gap-2">
      <label htmlFor="lang-select" className="text-sm text-[var(--muted-foreground)] hidden sm:inline">{compact ? "" : "Language"}</label>
      <select
        id="lang-select"
        className="bg-[var(--card)] text-[var(--foreground)] border border-[var(--input-border)] rounded-md px-2 py-1 text-sm"
        value={locale}
        onChange={onChange}
      >
        {locales.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}

