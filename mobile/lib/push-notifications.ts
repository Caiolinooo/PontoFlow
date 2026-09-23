/**
 * Push Notifications Module for PontoFlow Mobile
 * 
 * Provides push notification functionality using Expo Push Notifications
 * 
 * Features:
 * - Register device for push notifications
 * - Request notification permissions
 * - Handle notification tokens
 * - Subscribe to notification channels
 * 
 * Usage:
 *   import { pushNotifications } from '@/lib/push-notifications';
 *   await pushNotifications.register();
 */

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { useState, useEffect } from 'react';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Notification permission status
 */
export type NotificationPermission = 'undetermined' | 'granted' | 'denied';

/**
 * Device registration data
 */
export interface PushDeviceRegistration {
  userId: string;
  deviceToken: string;
  platform: 'android' | 'ios' | 'unknown';
  modelName: string;
  osName: string;
  osVersion: string;
  appVersion: string;
  pushEnabled: boolean;
}

/**
 * Push Notifications Manager
 */
export class PushNotificationsManager {
  private subscription?: Notifications.Subscription;
  private registration: PushDeviceRegistration | null = null;

  /**
   * Initialize push notifications
   * Must be called on app startup
   */
  async initialize(): Promise<boolean> {
    try {
      // Request permissions first
      const permissionStatus = await this.requestPermissions();
      if (permissionStatus !== 'granted') {
        console.log('[PushNotifications] Permissions not granted');
        return false;
      }

      // Get device token
      const token = await this.getExpoPushToken();
      if (!token) {
        console.log('[PushNotifications] No push token available');
        return false;
      }

      // Register device
      await this.registerDevice(token.data);
      
      // Setup notification listeners
      this.setupNotificationListeners();

      console.log('[PushNotifications] Initialized successfully');
      return true;
    } catch (error: any) {
      console.error('[PushNotifications] Initialization error:', error);
      return false;
    }
  }

  /**
   * Request notification permissions from user
   */
  async requestPermissions(): Promise<NotificationPermission> {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          displayInCarPlay: false,
          allowCriticalAlerts: true,
        },
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,
          allowProvisional: false,
          allowDisplayInCarPlay: false,
        },
      });
      
      return status;
    } catch (error) {
      console.error('[PushNotifications] Error requesting permissions:', error);
      return 'undetermined';
    }
  }

  /**
   * Get Expo push token for this device
   */
  async getExpoPushToken(): Promise<{ platform: 'android' | 'ios' | 'unknown'; data: string } | null> {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        // extra.eas.projectId from app.json
        projectId: 'a20f7eb9-954a-4e1a-888d-8a8cc834cbbf',
      });
      return { platform: Platform.OS as 'android' | 'ios' | 'unknown', data: token.data };
    } catch (error) {
      console.error('[PushNotifications] Error getting push token:', error);
      return null;
    }
  }

  /**
   * Register device with Supabase for push notifications
   */
  async registerDevice(token: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[PushNotifications] No session, skipping registration');
        return;
      }

      const userId = session.user.id;

      // Get device info
      const deviceInfo = await Notifications.getDevicePushTokenAsync();
      const modelName = Constants.deviceName || 'Unknown';
      const osName = Platform.OS;
      const osVersion = Platform.Version?.toString() || '';

      this.registration = {
        userId,
        deviceToken: token,
        platform: Platform.OS as 'android' | 'ios' | 'unknown',
        modelName,
        osName,
        osVersion,
        appVersion: '1.0.0', // Update with actual version
        pushEnabled: true,
      };

      // Upsert push subscription in database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: userId,
            expo_push_token: token,
            platform: this.registration.platform,
            model: modelName,
            os_name: osName,
            os_version: osVersion,
            app_version: this.registration.appVersion,
            push_enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,expo_push_token',
          }
        );

      if (error) {
        console.error('[PushNotifications] Registration error:', error);
      } else {
        console.log('[PushNotifications] Device registered successfully');
      }
    } catch (error: any) {
      console.error('[PushNotifications] Register device error:', error);
    }
  }

  /**
   * Setup notification listeners
   */
  private setupNotificationListeners(): void {
    // Handle notification opened
    this.subscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[PushNotifications] Notification received:', notification.request.content.title);
      // Handle background/terminated state notifications
    });

    // Handle notification response (when user taps notification)
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('[PushNotifications] Notification tapped:', data);
      
      // Navigate based on notification type
      if (data?.type === 'timesheet_approved') {
        // Navigate to timesheet detail
      } else if (data?.type === 'timesheet_rejected') {
        // Navigate to timesheet detail
      } else if (data?.type === 'reminder') {
        // Navigate to timesheet
      }
    });
  }

  /**
   * Unregister device (on logout)
   */
  async unregisterDevice(): Promise<void> {
    try {
      if (this.subscription) {
        this.subscription.remove();
        this.subscription = undefined;
      }

      if (this.registration) {
        await supabase
          .from('push_subscriptions')
          .update({ push_enabled: false })
          .match({
            user_id: this.registration.userId,
            expo_push_token: this.registration.deviceToken,
          });

        console.log('[PushNotifications] Device unregistered');
      }
    } catch (error: any) {
      console.error('[PushNotifications] Unregister error:', error);
    }
  }

  /**
   * Check if push notifications are enabled for current user
   */
  async isPushEnabled(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const { data } = await supabase
        .from('push_subscriptions')
        .select('push_enabled')
        .eq('user_id', session.user.id)
        .maybeSingle();

      return data?.push_enabled ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Toggle push notification enabled status
   */
  async togglePushEnabled(enabled: boolean): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      await supabase
        .from('push_subscriptions')
        .update({ 
          push_enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .match({
          user_id: session.user.id,
        });

      return true;
    } catch (error) {
      console.error('[PushNotifications] Toggle error:', error);
      return false;
    }
  }
}

/**
 * Hook to use push notifications in components
 */
export function usePushNotifications() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      const manager = new PushNotificationsManager();
      const status = await manager.isPushEnabled();
      setIsEnabled(status);
      setIsLoading(false);
    }
    
    checkStatus();
  }, []);

  const toggle = async (value: boolean) => {
    const manager = new PushNotificationsManager();
    const success = await manager.togglePushEnabled(value);
    if (success) {
      setIsEnabled(value);
    }
    return success;
  };

  return {
    isEnabled,
    isLoading,
    toggle,
  };
}

// Export singleton instance
export const pushNotifications = new PushNotificationsManager();
