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
      const response = await fetch(`/api/notifications/list?unread=true`);
      if (response.ok) {
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
        }
      }
    } catch (error) {
      console.error('Failed to show notification from API:', error);
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
      const response = await fetch('/api/notifications/list?unread=true');
      if (response.ok) {
        const data = await response.json();
        return data.unread_count || 0;
      }
    } catch (error) {
      console.error('Failed to get unread count:', error);
    }
    return 0;
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

  React.useEffect(() => {
    // Load initial unread count
    notificationManager.getUnreadCount().then(setUnreadCount);

    // Subscribe to updates
    const unsubscribe = notificationManager.subscribe('react-hook', (notifs) => {
      setNotifications(notifs);
      setUnreadCount(notifs.length);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const show = React.useCallback((notification: InAppNotification) => {
    notificationManager.show(notification);
  }, []);

  const refreshUnreadCount = React.useCallback(async () => {
    const count = await notificationManager.getUnreadCount();
    setUnreadCount(count);
  }, []);

  return {
    unreadCount,
    notifications,
    show,
    refreshUnreadCount
  };
}