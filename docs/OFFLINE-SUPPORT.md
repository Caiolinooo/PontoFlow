# Offline Support

## Overview

The Timesheet Manager provides comprehensive offline support using IndexedDB and Service Workers, allowing users to view and edit timesheets even without an internet connection.

## Features

- **Offline viewing** of cached timesheets
- **Action queuing** for sync when online
- **Automatic sync** when connection restored
- **Cache management** with TTL
- **User preferences** stored locally
- **Progressive Web App (PWA)** capabilities

## Architecture

```
┌─────────────┐
│   Browser   │
│   Client    │
└──────┬──────┘
       │
       ├─────► Service Worker (Cache API)
       │       - Static assets
       │       - API responses
       │
       └─────► IndexedDB
               - Timesheets
               - Pending actions
               - Preferences
               - Cache
```

## Storage Structure

### IndexedDB Stores

1. **timesheets** - Cached timesheet data
2. **pendingActions** - Actions to sync when online
3. **preferences** - User preferences
4. **cache** - API response cache with TTL

## Usage

### Initialize Storage

```typescript
import { getOfflineStorage } from '@/lib/offline/storage';

// Initialize on app start
const storage = getOfflineStorage();
await storage.init();
```

### Cache Timesheets

```typescript
import { getOfflineStorage } from '@/lib/offline/storage';

// Save timesheet for offline access
const storage = getOfflineStorage();
await storage.saveTimesheet('ts-123', timesheetData);

// Retrieve offline
const timesheet = await storage.getTimesheet('ts-123');

// Get all cached timesheets
const allTimesheets = await storage.getAllTimesheets();
```

### Queue Actions

```typescript
import { getOfflineStorage } from '@/lib/offline/storage';

// Queue action when offline
const storage = getOfflineStorage();
await storage.queueAction({
  type: 'submit',
  endpoint: '/api/employee/timesheets/ts-123/submit',
  method: 'POST',
  body: { notes: 'Submitted offline' },
});

// Actions will sync automatically when online
```

### Sync Pending Actions

```typescript
import { syncPendingActions } from '@/lib/offline/storage';

// Manual sync
await syncPendingActions();

// Automatic sync on reconnect
window.addEventListener('online', () => {
  syncPendingActions();
});
```

### Cache API Responses

```typescript
import { getOfflineStorage } from '@/lib/offline/storage';

const storage = getOfflineStorage();

// Cache response (1 hour TTL)
await storage.cacheResponse('/api/timesheets', data, 3600000);

// Get cached response
const cached = await storage.getCachedResponse('/api/timesheets');
if (cached) {
  return cached; // Use cached data
}

// Fetch from API if not cached
const response = await fetch('/api/timesheets');
const data = await response.json();
await storage.cacheResponse('/api/timesheets', data);
```

### User Preferences

```typescript
import { getOfflineStorage } from '@/lib/offline/storage';

const storage = getOfflineStorage();

// Save preference
await storage.savePreference('theme', 'dark');

// Get preference
const theme = await storage.getPreference('theme');
```

## Service Worker

### Registration

```typescript
// app/layout.tsx
'use client';

import { useEffect } from 'react';

export default function RootLayout({ children }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return <html>{children}</html>;
}
```

### Service Worker Implementation

```javascript
// public/service-worker.js
const CACHE_NAME = 'timesheet-manager-v1';
const STATIC_CACHE = [
  '/',
  '/dashboard',
  '/offline',
  '/_next/static/css/app.css',
  '/_next/static/js/app.js',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE);
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response; // Serve from cache
      }

      return fetch(event.request).then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Return offline page if network fails
        return caches.match('/offline');
      });
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

## Offline UI

### Connection Status Indicator

```typescript
'use client';

import { useState, useEffect } from 'react';

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-yellow-500 text-white px-4 py-2 text-center">
      You are offline. Changes will sync when connection is restored.
    </div>
  );
}
```

### Offline Page

```typescript
// app/offline/page.tsx
export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">You're Offline</h1>
      <p className="text-gray-600 mb-8">
        Please check your internet connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg"
      >
        Retry
      </button>
    </div>
  );
}
```

### Pending Actions Indicator

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getOfflineStorage } from '@/lib/offline/storage';

export function PendingActionsIndicator() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      const storage = getOfflineStorage();
      const actions = await storage.getPendingActions();
      setCount(actions.length);
    };

    updateCount();

    // Update every 5 seconds
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <div className="bg-blue-500 text-white px-4 py-2 text-center">
      {count} action{count > 1 ? 's' : ''} pending sync
    </div>
  );
}
```

## PWA Configuration

### Manifest

```json
// public/manifest.json
{
  "name": "Timesheet Manager ABZ Group",
  "short_name": "Timesheet",
  "description": "Manage timesheets for ABZ Group",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0066cc",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Meta Tags

```html
<!-- app/layout.tsx -->
<head>
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#0066cc" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Timesheet" />
  <link rel="apple-touch-icon" href="/icon-192.png" />
</head>
```

## Best Practices

1. **Cache strategically** - Only cache essential data
2. **Set appropriate TTLs** - Balance freshness vs offline access
3. **Show offline status** - Keep users informed
4. **Queue actions** - Don't lose user work
5. **Sync intelligently** - Batch actions, handle conflicts
6. **Test offline** - Use Chrome DevTools Network throttling

## Conflict Resolution

### Last Write Wins

```typescript
async function syncAction(action) {
  try {
    const response = await fetch(action.endpoint, {
      method: action.method,
      body: JSON.stringify(action.body),
    });

    if (response.ok) {
      // Success - delete action
      await storage.deletePendingAction(action.id);
    } else if (response.status === 409) {
      // Conflict - server version newer
      console.warn('Conflict detected, server version kept');
      await storage.deletePendingAction(action.id);
    } else {
      // Other error - keep action for retry
      console.error('Sync failed:', response.status);
    }
  } catch (err) {
    console.error('Sync error:', err);
  }
}
```

## Monitoring

### Storage Usage

```typescript
if ('storage' in navigator && 'estimate' in navigator.storage) {
  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage / estimate.quota;
  console.log(`Storage: ${(usage * 100).toFixed(2)}% used`);
}
```

### Pending Actions

```typescript
const storage = getOfflineStorage();
const actions = await storage.getPendingActions();
console.log(`${actions.length} actions pending sync`);
```

## Troubleshooting

### Storage Quota Exceeded
- Clear expired cache entries
- Reduce cache TTL
- Implement LRU eviction
- Request persistent storage

### Sync Failures
- Check network connectivity
- Verify API endpoints
- Handle authentication expiry
- Implement retry logic

### Service Worker Issues
- Clear browser cache
- Unregister and re-register
- Check console for errors
- Verify HTTPS (required for SW)

## Future Enhancements

- [ ] Conflict resolution UI
- [ ] Selective sync
- [ ] Background sync API
- [ ] Periodic background sync
- [ ] Push notifications for sync status
- [ ] Compression for cached data

