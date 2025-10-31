'use client';

import React, { useState, useEffect } from 'react';
import { useInAppNotifications } from '@/lib/notifications/in-app-notifications';

interface NotificationBadgeProps {
  className?: string;
  onClick: () => void;
}

export default function NotificationBadge({ className = '', onClick }: NotificationBadgeProps) {
  const { unreadCount } = useInAppNotifications();
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
      onClick={onClick}
      className={`relative p-2 rounded-lg hover:bg-[var(--surface-elevated)] transition-colors ${className}`}
      aria-label="Notifications"
    >
      {/* Notification Bell Icon */}
      <svg
        className="w-5 h-5 text-[var(--surface-foreground)]"
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

      {/* Unread Count Badge */}
      {unreadCount > 0 && (
        <div
          className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[var(--destructive)] text-[var(--destructive-foreground)] text-xs font-bold rounded-full flex items-center justify-center transition-transform ${
            isAnimating ? 'animate-pulse scale-110' : ''
          }`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}

      {/* Pulse animation for new notifications */}
      {unreadCount > 0 && isAnimating && (
        <div className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[var(--destructive)] rounded-full animate-ping opacity-75" />
      )}
    </button>
  );
}