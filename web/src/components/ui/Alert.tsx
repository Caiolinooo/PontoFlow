"use client";

import React from 'react';

type Variant = 'success' | 'error' | 'warning' | 'info';

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  role?: 'alert' | 'status';
  className?: string;
};

const styles: Record<Variant, string> = {
  success: 'bg-emerald-600 text-white border-emerald-700',
  error: 'bg-red-600 text-white border-red-700',
  warning: 'bg-amber-500 text-black border-amber-600',
  info: 'bg-blue-600 text-white border-blue-700'
};

export default function Alert({ children, variant = 'info', role = 'alert', className = '' }: Props) {
  return (
    <div
      role={role}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
      className={`border rounded-lg p-3 text-sm ${styles[variant]} ${className}`}
      style={{ borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  );
}

