"use client";

import React from 'react';
import { useToast } from '@/components/ui/ToastProvider';

export interface InAppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  data?: Record<string, any>;
}

class InAppNotificationManager {
  private static instance: InAppNotificationManager;
  private toast: ReturnType<typeof useToast> | null = null;
  private listeners: Map<string, (notifications: InAppNotification[]) => void> = new Map();

  static getInstance(): InAppNotificationManager {
    if (!InAppNotificationManager.instance) {
      InAppNotificationManager.instance = new InAppNotificationManager();
    }
    return InAppNotificationManager.instance;
  }

  setToast(toast: ReturnType<typeof useToast>) {
    this.toast = toast;
  }

  // Show toast notification
  show(notification: InAppNotification) {
    if (!this.toast) {
      console.warn('Toast provider not set');
      return;
    }

    const { show, success, error, info, warning } = this.toast;
    
    const duration = notification.duration ?? 5000;

    switch (notification.type) {
      case 'success':
        success(notification.message, duration);
        break;
      case 'error':
        error(notification.message, duration);
        break;
      case 'warning':
        warning(notification.message, duration);
        break;
      case 'info':
      default:
        info(notification.message, duration);
        break;
    }
  }

  // Create and show notification from API data
  async showFromAPI(notificationId: string) {
    try {
      const response = await fetch(`/api/notifications/list?unread=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        console.warn('Failed to fetch notification data:', response.status, response.statusText);
        return;
      }

      const data = await response.json();
      const notification = data.notifications?.find((n: any) => n.id === notificationId);

      if (notification) {
        this.show({
          id: notification.id,
          type: this.mapEventToType(notification.event),
          title: notification.title,
          message: notification.message,
          data: notification.data
        });
      } else {
        console.warn('Notification not found:', notificationId);
      }
    } catch (error) {
      console.warn('Failed to show notification from API (network or server error):', error instanceof Error ? error.message : error);
    }
  }

  // Map notification events to toast types
  private mapEventToType(event: string): InAppNotification['type'] {
    const eventTypeMap: Record<string, InAppNotification['type']> = {
      'timesheet_approved': 'success',
      'timesheet_rejected': 'error',
      'timesheet_submitted': 'info',
      'deadline_reminder': 'warning',
      'annotation_added': 'info',
      'approval_reminder': 'warning',
      'team_update': 'info'
    };

    return eventTypeMap[event] || 'info';
  }

  // Subscribe to notification updates
  subscribe(id: string, callback: (notifications: InAppNotification[]) => void) {
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }

  // Notify all subscribers
  private notifyListeners(notifications: InAppNotification[]) {
    this.listeners.forEach((callback) => {
      try {
        callback(notifications);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Get unread notifications count
  async getUnreadCount(): Promise<number> {
    try {
      const response = await fetch('/api/notifications/list?unread=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        console.warn('Notification API response not OK:', response.status, response.statusText);
        return 0;
      }

      const data = await response.json();
      return data.unread_count || 0;
    } catch (error) {
      console.warn('Failed to get unread count (network or server error):', error instanceof Error ? error.message : error);
      return 0;
    }
  }

  // Mark notifications as read
  async markAsRead(notificationIds: string[]) {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: notificationIds })
      });
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  }
}

export const notificationManager = InAppNotificationManager.getInstance();

// React hook for using notifications
export function useInAppNotifications() {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notifications, setNotifications] = React.useState<InAppNotification[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadUnreadCount = React.useCallback(async (retryCount = 0) => {
    try {
      setIsLoading(true);
      setError(null);
      const count = await notificationManager.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.warn('Failed to load unread count:', errorMessage);
      setError(errorMessage);

      // Retry logic for network errors (max 3 retries with exponential backoff)
      if (retryCount < 3 && errorMessage.includes('fetch')) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        setTimeout(() => loadUnreadCount(retryCount + 1), delay);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // Load initial unread count
    loadUnreadCount();

    // Set up periodic refresh (every 30 seconds)
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000);

    // Subscribe to updates
    const unsubscribe = notificationManager.subscribe('react-hook', (notifs) => {
      setNotifications(notifs);
      setUnreadCount(notifs.length);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [loadUnreadCount]);

  const show = React.useCallback((notification: InAppNotification) => {
    notificationManager.show(notification);
  }, []);

  const refreshUnreadCount = React.useCallback(async () => {
    await loadUnreadCount();
  }, [loadUnreadCount]);

  const retry = React.useCallback(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  return {
    unreadCount,
    notifications,
    isLoading,
    error,
    show,
    refreshUnreadCount,
    retry
  };
}