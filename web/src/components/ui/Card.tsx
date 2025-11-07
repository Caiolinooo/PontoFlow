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
    ? 'cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 animate-fade-in card-hover button-ripple'
    : '';

  const hoverClasses = hoverable && !isInteractive
    ? 'transition-all duration-300 hover:shadow-md hover:border-[var(--primary)]/30 hover-smooth animate-gentle-fade-in'
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
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-start justify-between gap-3 animate-slide-in-right">
          <div className="flex-1 min-w-0">
            {title && <h3 className="text-base font-semibold text-[var(--card-foreground)] truncate animate-gentle-fade-in">{title}</h3>}
            {subtitle && <p className="text-sm text-[var(--muted-foreground)] mt-0.5 animate-fade-in">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0 animate-slide-in-left">{actions}</div>}
        </div>
      )}
      <div className="px-5 py-4 text-[var(--foreground)]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        ) : (
          <div className="animate-gentle-fade-in">
            {children}
          </div>
        )}
      </div>
    </Component>
  );
}

