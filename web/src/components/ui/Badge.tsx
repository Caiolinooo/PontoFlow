/**
 * Badge Component
 * 
 * Small status indicator with variants and animations.
 * 
 * Usage:
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning" pulse>Pending</Badge>
 */

'use client';

import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Visual variant
   */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Add pulse animation
   */
  pulse?: boolean;
  
  /**
   * Add dot indicator
   */
  dot?: boolean;
  
  /**
   * Make badge removable
   */
  onRemove?: () => void;
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  pulse = false,
  dot = false,
  onRemove,
  className = '',
  ...props
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-[var(--muted)] text-[var(--foreground)] border-[var(--border)]',
    primary: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20',
    success: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    warning: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    danger: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    info: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const dotColors = {
    default: 'bg-[var(--foreground)]',
    primary: 'bg-[var(--primary)]',
    success: 'bg-green-600 dark:bg-green-400',
    warning: 'bg-amber-600 dark:bg-amber-400',
    danger: 'bg-red-600 dark:bg-red-400',
    info: 'bg-blue-600 dark:bg-blue-400',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        transition-all duration-200
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} ${pulse ? 'animate-pulse' : ''}`}
          aria-hidden="true"
        />
      )}
      {children}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current"
          aria-label="Remove"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}

/**
 * Status Badge - Pre-configured for common statuses
 */

export interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'draft';
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const statusConfig = {
    active: { variant: 'success' as const, label: 'Active', dot: true, pulse: true },
    inactive: { variant: 'default' as const, label: 'Inactive', dot: true, pulse: false },
    pending: { variant: 'warning' as const, label: 'Pending', dot: true, pulse: true },
    approved: { variant: 'success' as const, label: 'Approved', dot: true, pulse: false },
    rejected: { variant: 'danger' as const, label: 'Rejected', dot: true, pulse: false },
    draft: { variant: 'info' as const, label: 'Draft', dot: true, pulse: false },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      size={size}
      dot={config.dot}
      pulse={config.pulse}
    >
      {config.label}
    </Badge>
  );
}

