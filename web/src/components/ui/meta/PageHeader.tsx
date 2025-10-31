"use client";

import React from 'react';

type Crumb = { label: React.ReactNode; href?: string };

export function MetaPageHeader({
  title,
  subtitle,
  actions,
  className,
  breadcrumbs,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  breadcrumbs?: Crumb[];
}) {
  return (
    <div className={"space-y-2 " + (className || "") }>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="text-xs text-[var(--muted-foreground)]">
          <ol className="flex items-center gap-1">
            {breadcrumbs.map((c, idx) => (
              <li key={idx} className="flex items-center gap-1">
                {c.href ? (
                  <a href={c.href} className="hover:text-[var(--foreground)] underline-offset-2 hover:underline">{c.label}</a>
                ) : (
                  <span>{c.label}</span>
                )}
                {idx < breadcrumbs.length - 1 && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-60">
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">{title}</h1>
          {subtitle && <p className="text-sm text-[var(--muted-foreground)] mt-1">{subtitle}</p>}
        </div>
        <div className="flex gap-2">{actions}</div>
      </div>
    </div>
  );
}

export default MetaPageHeader;

