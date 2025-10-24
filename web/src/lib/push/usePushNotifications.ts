'use client';

import { useEffect, useState } from 'react';
import { getVAPIDPublicKey } from './vapid';

export interface PushNotificationState {
  supported: boolean;
  subscribed: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for managing push notifications
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    supported: false,
    subscribed: false,
    loading: true,
    error: null,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const supported =
          'serviceWorker' in navigator &&
          'PushManager' in window &&
          'Notification' in window;

        if (!supported) {
          setState((prev) => ({
            ...prev,
            supported: false,
            loading: false,
          }));
          return;
        }

        // Register service worker
        const registration = await navigator.serviceWorker.register(
          '/service-worker.js',
          { scope: '/' }
        );

        // Check if already subscribed
        const subscription = await registration.pushManager.getSubscription();
        setState((prev) => ({
          ...prev,
          supported: true,
          subscribed: !!subscription,
          loading: false,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setState((prev) => ({
          ...prev,
          supported: false,
          loading: false,
          error: message,
        }));
      }
    };

    checkSupport();
  }, []);

  /**
   * Subscribe to push notifications
   */
  const subscribe = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = getVAPIDPublicKey();

      if (!vapidKey) {
        throw new Error('VAPID key not configured');
      }

      const keyBytes = urlBase64ToUint8Array(vapidKey);
      const buffer = new ArrayBuffer(keyBytes.byteLength);
      new Uint8Array(buffer).set(keyBytes);
      const applicationServerKey = buffer;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Send subscription to server
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      if (!res.ok) throw new Error('Failed to subscribe');

      setState((prev) => ({
        ...prev,
        subscribed: true,
        loading: false,
      }));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
      return false;
    }
  };

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Notify server
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setState((prev) => ({
        ...prev,
        subscribed: false,
        loading: false,
      }));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
      return false;
    }
  };

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

