"use client";

import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

const variants: Record<Variant, string> = {
  primary: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50 shadow-sm hover:shadow-md',
  secondary: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90 disabled:opacity-50 shadow-sm hover:shadow-md',
  danger: 'bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90 disabled:opacity-50 shadow-sm hover:shadow-md',
  ghost: 'bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]',
};

export default function Button({ variant = 'primary', loading, className = '', children, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center px-5 py-2.5 rounded-md font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:scale-[0.98] ${variants[variant]} ${className}`}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}

