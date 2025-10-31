"use client";

import React from 'react';
import { notificationManager } from './in-app-notifications';
import { usePushNotifications } from '@/lib/push/usePushNotifications';

export interface UnifiedNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  userId: string;
  email?: string;
  locale?: string;
  tenantId?: string;
  
  // Notification preferences
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  
  // Event type
  event: string;
}

class UnifiedNotificationService {
  private static instance: UnifiedNotificationService;

  static getInstance(): UnifiedNotificationService {
    if (!UnifiedNotificationService.instance) {
      UnifiedNotificationService.instance = new UnifiedNotificationService();
    }
    return UnifiedNotificationService.instance;
  }

  async sendUnifiedNotification(payload: UnifiedNotificationPayload): Promise<void> {
    const {
      title,
      body,
      data,
      userId,
      email,
      event,
      emailEnabled = true,
      pushEnabled = true,
      inAppEnabled = true
    } = payload;

    // Send in-app notification
    if (inAppEnabled) {
      try {
        await notificationManager.show({
          id: Math.random().toString(36).substr(2, 9),
          type: this.mapEventToType(event),
          title,
          message: body,
          data
        });

        // Also create persistent notification
        await this.createPersistentNotification(userId, {
          type: 'in_app',
          event,
          title,
          message: body,
          data
        });
      } catch (error) {
        console.error('Failed to send in-app notification:', error);
      }
    }

    // Send push notification
    if (pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: event,
          data
        });
      } catch (error) {
        console.error('Failed to send push notification:', error);
      }
    }

    // Send email notification (via existing system)
    if (emailEnabled && email) {
      try {
        await this.sendEmailNotification(email, title, body, data);
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    }
  }

  private async createPersistentNotification(
    userId: string, 
    notification: {
      type: string;
      event: string;
      title: string;
      message: string;
      data?: Record<string, any>;
    }
  ) {
    try {
      await fetch('/api/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ...notification
        })
      });
    } catch (error) {
      console.error('Failed to create persistent notification:', error);
    }
  }

  private async sendEmailNotification(
    email: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ) {
    try {
      await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data?.event || 'custom',
          to: email,
          payload: {
            title,
            message: body,
            data
          }
        })
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  private mapEventToType(event: string): 'success' | 'error' | 'warning' | 'info' {
    const eventTypeMap: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
      'timesheet_approved': 'success',
      'timesheet_rejected': 'error',
      'timesheet_submitted': 'info',
      'deadline_reminder': 'warning',
      'approval_reminder': 'warning',
      'annotation_added': 'info',
      'team_update': 'info'
    };

    return eventTypeMap[event] || 'info';
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }
}

export const unifiedNotificationService = UnifiedNotificationService.getInstance();

// React hook for unified notifications
export function useUnifiedNotifications() {
  const pushNotifications = usePushNotifications();
  const [permission, setPermission] = React.useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'denied'
  );

  const requestPermission = React.useCallback(async () => {
    const granted = await unifiedNotificationService.requestPermission();
    setPermission(granted ? 'granted' : 'denied');
    return granted;
  }, []);

  const sendNotification = React.useCallback(async (payload: UnifiedNotificationPayload) => {
    await unifiedNotificationService.sendUnifiedNotification({
      ...payload,
      pushEnabled: payload.pushEnabled && permission === 'granted'
    });
  }, [permission]);

  return {
    permission,
    requestPermission,
    sendNotification,
    supported: typeof window !== 'undefined' && 'Notification' in window
  };
}