/**
 * Notification types
 */

import { NotificationType, NotificationEvent } from './enums';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  event: NotificationEvent;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  events: {
    [key in NotificationEvent]?: boolean;
  };
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  created_at: string;
}

