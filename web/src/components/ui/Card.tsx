'use client';

import React from 'react';

type Props = {
  title?: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  hoverable?: boolean;
};

export default function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
  onClick,
  loading,
  disabled,
  hoverable = false,
}: Props) {
  const isInteractive = Boolean(onClick);

  const interactiveClasses = isInteractive
    ? 'cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2'
    : '';

  const hoverClasses = hoverable && !isInteractive
    ? 'transition-all duration-200 hover:shadow-md hover:border-[var(--primary)]/30'
    : '';

  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed pointer-events-none'
    : '';

  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!disabled && !loading && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  const Component = isInteractive ? 'button' : 'div';

  return (
    <Component
      onClick={isInteractive ? handleClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      tabIndex={isInteractive && !disabled ? 0 : undefined}
      role={isInteractive ? 'button' : undefined}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      className={`
        bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm
        ${interactiveClasses}
        ${hoverClasses}
        ${disabledClasses}
        ${className}
      `}
    >
      {(title || actions || subtitle) && (
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {title && <h3 className="text-base font-semibold text-[var(--card-foreground)] truncate">{title}</h3>}
            {subtitle && <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className="px-5 py-4 text-[var(--foreground)]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <svg
              className="animate-spin h-8 w-8 text-[var(--primary)]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          </div>
        ) : (
          children
        )}
      </div>
    </Component>
  );
}

