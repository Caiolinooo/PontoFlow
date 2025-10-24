"use client";
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function BackBar() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname?.split('/')?.[1] || 'pt-BR';

  return (
    <div className="sticky top-16 z-30 bg-[var(--muted)]/40 border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2 text-sm">
        <button
          onClick={() => router.back()}
          className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          aria-label="Voltar"
        >
          ← Voltar
        </button>
        <a
          href={`/${locale}/dashboard`}
          className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          ⌂ Início
        </a>
      </div>
    </div>
  );
}

