import React from 'react';

type Props = {
  title?: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export default function Card({ title, subtitle, actions, children, className = '' }: Props) {
  return (
    <div className={`bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm ${className}`}>
      {(title || actions || subtitle) && (
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-base font-semibold text-[var(--card-foreground)]">{title}</h3>}
            {subtitle && <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="px-5 py-4 text-[var(--foreground)]">{children}</div>
    </div>
  );
}

