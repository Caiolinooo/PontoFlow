'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  size = 'md',
  label,
  className = '',
  fullScreen = false
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'w-3 h-3 border-2',
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  };

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className} animate-gentle-fade-in`}>
      <div className="relative">
        <div
          className={`${sizeClasses[size]} border-[var(--muted)] border-t-[var(--primary)] rounded-full animate-spin`}
          role="status"
          aria-label={label || 'Loading'}
          aria-busy="true"
        />
        <div
          className={`${sizeClasses[size]} border-[var(--muted)] border-r-[var(--primary)]/30 rounded-full animate-spin absolute top-0 left-0`}
          style={{ animationDelay: '0.15s', animationDirection: 'reverse' }}
        />
      </div>
      {label && (
        <p className="text-sm text-[var(--muted-foreground)] animate-pulse">
          {label}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-[var(--background)]/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
        {spinner}
      </div>
    );
  }

  return spinner;
}

