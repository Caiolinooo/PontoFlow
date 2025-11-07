'use client';

import React, { useState, useEffect } from 'react';
import { useInAppNotifications } from '@/lib/notifications/in-app-notifications';

interface NotificationBadgeProps {
  className?: string;
  onClick: () => void;
}

export default function NotificationBadge({ className = '', onClick }: NotificationBadgeProps) {
  const { unreadCount, isLoading, error, retry } = useInAppNotifications();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (unreadCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  return (
    <button
      onClick={() => {
        if (error) {
          retry(); // Retry on error
        } else {
          onClick();
        }
      }}
      className={`relative p-2 rounded-lg hover:bg-[var(--surface-elevated)] transition-all duration-300 hover:scale-105 ${className} animate-slide-in-right group ${
        error ? 'bg-[var(--destructive)]/10 border border-[var(--destructive)]/30' : ''
      }`}
      aria-label={error ? "Retry notifications" : "Notifications"}
      title={error ? `Click to retry: ${error}` : "Notifications"}
    >
      {/* Notification Bell Icon */}
      {isLoading ? (
        <div className="w-5 h-5 animate-spin">
          <svg className="w-5 h-5 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        </div>
      ) : error ? (
        <svg className="w-5 h-5 text-[var(--destructive)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ) : (
        <svg
          className="w-5 h-5 text-[var(--surface-foreground)] group-hover:text-[var(--primary)] transition-colors duration-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-5 5-5-5h5V3h10v14z"
          />
        </svg>
      )}

      {/* Unread Count Badge */}
      {unreadCount > 0 && !isLoading && !error && (
        <div
          className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[var(--destructive)] text-[var(--destructive-foreground)] text-xs font-bold rounded-full flex items-center justify-center transition-all duration-300 animate-scale-in notification-badge ${
            isAnimating ? 'animate-pulse scale-110 ring-2 ring-[var(--destructive)]/50' : 'hover:scale-110'
          }`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}

      {/* Pulse animation for new notifications */}
      {unreadCount > 0 && isAnimating && !isLoading && !error && (
        <div className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[var(--destructive)] rounded-full animate-ping opacity-75" />
      )}

      {/* Error indicator */}
      {error && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--destructive)] rounded-full animate-pulse" />
      )}

      {/* Subtle glow effect when there are unread notifications */}
      {unreadCount > 0 && !isLoading && !error && (
        <div className="absolute inset-0 rounded-lg bg-[var(--destructive)]/5 animate-pulse" />
      )}
    </button>
  );
}