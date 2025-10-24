/**
 * Service Worker for Web Push Notifications
 */

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push notification received but no data');
    return;
  }

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification',
      icon: '/logo-abz.png',
      badge: '/logo-abz.png',
      tag: data.tag || 'notification',
      requireInteraction: data.requireInteraction || false,
      data: data.data || {},
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Timesheet Manager', options)
    );
  } catch (err) {
    console.error('Error handling push notification:', err);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if window is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if not found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});

// Background sync for offline support
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  try {
    // Sync pending notifications when back online
    const response = await fetch('/api/notifications/sync', { method: 'POST' });
    return response.ok;
  } catch (err) {
    console.error('Error syncing notifications:', err);
    return false;
  }
}

