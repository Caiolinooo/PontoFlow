/**
 * EmptyState Component
 * 
 * Displays a friendly message when there's no data to show.
 * Helps improve UX by providing context and actions.
 * 
 * Usage:
 * <EmptyState 
 *   icon="inbox"
 *   title="No timesheets yet"
 *   description="Create your first timesheet to get started"
 *   action={{ label: "Create Timesheet", onClick: () => {} }}
 * />
 */

'use client';

import React from 'react';

export interface EmptyStateProps {
  /**
   * Icon to display (predefined or custom SVG)
   */
  icon?: 'inbox' | 'search' | 'file' | 'users' | 'calendar' | 'settings' | React.ReactNode;
  
  /**
   * Main title text
   */
  title: string;
  
  /**
   * Description text (optional)
   */
  description?: string;
  
  /**
   * Primary action button (optional)
   */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  
  /**
   * Secondary action button (optional)
   */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  
  /**
   * Custom className for the container
   */
  className?: string;
  
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

const Icons = {
  inbox: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
  search: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  file: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  users: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  calendar: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  settings: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

export default function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  secondaryAction,
  className = '',
  size = 'md',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'w-12 h-12',
      title: 'text-base',
      description: 'text-xs',
    },
    md: {
      container: 'py-12',
      icon: 'w-16 h-16',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'w-20 h-20',
      title: 'text-xl',
      description: 'text-base',
    },
  };

  const iconElement = typeof icon === 'string' ? Icons[icon as keyof typeof Icons] : icon;

  return (
    <div 
      className={`flex flex-col items-center justify-center text-center ${sizeClasses[size].container} ${className}`}
      role="status"
      aria-label={title}
    >
      {/* Icon */}
      <div 
        className={`${sizeClasses[size].icon} text-[var(--muted-foreground)] mb-4 opacity-50`}
        aria-hidden="true"
      >
        {iconElement}
      </div>

      {/* Title */}
      <h3 className={`${sizeClasses[size].title} font-semibold text-[var(--foreground)] mb-2`}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={`${sizeClasses[size].description} text-[var(--muted-foreground)] max-w-md mb-6`}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className={`
                px-6 py-2.5 rounded-lg font-medium transition-all
                ${action.variant === 'secondary' 
                  ? 'bg-[var(--muted)] text-[var(--foreground)] hover:opacity-80' 
                  : 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90'
                }
                focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2
              `}
            >
              {action.label}
            </button>
          )}
          
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-6 py-2.5 rounded-lg font-medium bg-[var(--muted)] text-[var(--foreground)] hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pre-built empty state variants for common scenarios
 */

export const EmptyStateNoResults: React.FC<{ onClear?: () => void }> = ({ onClear }) => (
  <EmptyState
    icon="search"
    title="No results found"
    description="Try adjusting your search or filter to find what you're looking for"
    action={onClear ? { label: "Clear filters", onClick: onClear } : undefined}
  />
);

export const EmptyStateNoData: React.FC<{ 
  entityName: string; 
  onCreate?: () => void;
}> = ({ entityName, onCreate }) => (
  <EmptyState
    icon="inbox"
    title={`No ${entityName} yet`}
    description={`Get started by creating your first ${entityName}`}
    action={onCreate ? { label: `Create ${entityName}`, onClick: onCreate } : undefined}
  />
);

export const EmptyStateError: React.FC<{ 
  onRetry?: () => void;
}> = ({ onRetry }) => (
  <EmptyState
    icon="settings"
    title="Something went wrong"
    description="We couldn't load the data. Please try again."
    action={onRetry ? { label: "Try again", onClick: onRetry } : undefined}
  />
);

