"use client";

import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
};

const variants: Record<Variant, string> = {
  primary: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50 shadow-sm hover-lift button-ripple animate-gentle-fade-in',
  secondary: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90 disabled:opacity-50 shadow-sm hover-lift button-ripple animate-gentle-fade-in',
  danger: 'bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90 disabled:opacity-50 shadow-sm hover-lift button-ripple animate-gentle-fade-in',
  success: 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 shadow-sm hover-lift button-ripple animate-gentle-fade-in',
  ghost: 'bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-50 hover-smooth animate-gentle-fade-in',
  outline: 'bg-transparent border-2 border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-50 hover-smooth animate-gentle-fade-in',
};

const sizes: Record<Size, string> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
  xl: 'px-8 py-3 text-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  icon,
  iconPosition = 'left',
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      aria-busy={loading}
      aria-disabled={loading || rest.disabled}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-all duration-300 transform-gpu
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2
        disabled:cursor-not-allowed active:scale-95 hover:scale-105
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span aria-hidden="true">{icon}</span>
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <span aria-hidden="true">{icon}</span>
      )}
    </button>
  );
}

