/**
 * Offline Storage Manager
 * 
 * Provides offline support using IndexedDB:
 * - Cache timesheets for offline viewing
 * - Queue actions for sync when online
 * - Store user preferences
 * - Cache API responses
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface TimesheetManagerDB extends DBSchema {
  timesheets: {
    key: string;
    value: {
      id: string;
      data: unknown;
      timestamp: number;
    };
  };
  pendingActions: {
    key: number;
    value: {
      id?: number;
      type: 'create' | 'update' | 'delete' | 'submit' | 'approve' | 'reject';
      endpoint: string;
      method: string;
      body?: unknown;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
  preferences: {
    key: string;
    value: unknown;
  };
  cache: {
    key: string;
    value: {
      url: string;
      data: unknown;
      timestamp: number;
      expiresAt: number;
    };
    indexes: { 'by-expiry': number };
  };
}

const DB_NAME = 'timesheet-manager';
const DB_VERSION = 1;

/**
 * Offline storage manager
 */
export class OfflineStorage {
  private db: IDBPDatabase<TimesheetManagerDB> | null = null;

  /**
   * Initialize database
   */
  async init(): Promise<void> {
    this.db = await openDB<TimesheetManagerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Timesheets store
        if (!db.objectStoreNames.contains('timesheets')) {
          db.createObjectStore('timesheets', { keyPath: 'id' });
        }

        // Pending actions store
        if (!db.objectStoreNames.contains('pendingActions')) {
          const actionStore = db.createObjectStore('pendingActions', {
            keyPath: 'id',
            autoIncrement: true,
          });
          actionStore.createIndex('by-timestamp', 'timestamp');
        }

        // Preferences store
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences');
        }

        // Cache store
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'url' });
          cacheStore.createIndex('by-expiry', 'expiresAt');
        }
      },
    });
  }

  /**
   * Save timesheet for offline access
   */
  async saveTimesheet(id: string, data: unknown): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('timesheets', {
      id,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get timesheet from offline storage
   */
  async getTimesheet(id: string): Promise<unknown | null> {
    if (!this.db) await this.init();
    const record = await this.db!.get('timesheets', id);
    return record?.data || null;
  }

  /**
   * Get all cached timesheets
   */
  async getAllTimesheets(): Promise<Array<{ id: string; data: unknown; timestamp: number }>> {
    if (!this.db) await this.init();
    return await this.db!.getAll('timesheets');
  }

  /**
   * Delete timesheet from offline storage
   */
  async deleteTimesheet(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('timesheets', id);
  }

  /**
   * Queue action for sync when online
   */
  async queueAction(action: {
    type: 'create' | 'update' | 'delete' | 'submit' | 'approve' | 'reject';
    endpoint: string;
    method: string;
    body?: unknown;
  }): Promise<number> {
    if (!this.db) await this.init();
    return await this.db!.add('pendingActions', {
      ...action,
      timestamp: Date.now(),
    });
  }

  /**
   * Get all pending actions
   */
  async getPendingActions(): Promise<Array<{
    id?: number;
    type: string;
    endpoint: string;
    method: string;
    body?: unknown;
    timestamp: number;
  }>> {
    if (!this.db) await this.init();
    return await this.db!.getAll('pendingActions');
  }

  /**
   * Delete pending action
   */
  async deletePendingAction(id: number): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('pendingActions', id);
  }

  /**
   * Clear all pending actions
   */
  async clearPendingActions(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear('pendingActions');
  }

  /**
   * Save preference
   */
  async savePreference(key: string, value: unknown): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('preferences', value, key);
  }

  /**
   * Get preference
   */
  async getPreference(key: string): Promise<unknown | null> {
    if (!this.db) await this.init();
    return (await this.db!.get('preferences', key)) || null;
  }

  /**
   * Cache API response
   */
  async cacheResponse(url: string, data: unknown, ttl: number = 3600000): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('cache', {
      url,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Get cached response
   */
  async getCachedResponse(url: string): Promise<unknown | null> {
    if (!this.db) await this.init();
    const record = await this.db!.get('cache', url);
    
    if (!record) return null;
    
    // Check if expired
    if (record.expiresAt < Date.now()) {
      await this.db!.delete('cache', url);
      return null;
    }
    
    return record.data;
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    if (!this.db) await this.init();
    const now = Date.now();
    const allCache = await this.db!.getAll('cache');
    
    for (const entry of allCache) {
      if (entry.expiresAt < now) {
        await this.db!.delete('cache', entry.url);
      }
    }
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear('timesheets');
    await this.db!.clear('pendingActions');
    await this.db!.clear('preferences');
    await this.db!.clear('cache');
  }
}

// Singleton instance
let storage: OfflineStorage | null = null;

/**
 * Get offline storage instance
 */
export function getOfflineStorage(): OfflineStorage {
  if (!storage) {
    storage = new OfflineStorage();
  }
  return storage;
}

/**
 * Sync pending actions when online
 */
export async function syncPendingActions(): Promise<void> {
  const storage = getOfflineStorage();
  const actions = await storage.getPendingActions();

  console.log(`[Offline] Syncing ${actions.length} pending actions...`);

  for (const action of actions) {
    try {
      const response = await fetch(action.endpoint, {
        method: action.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: action.body ? JSON.stringify(action.body) : undefined,
      });

      if (response.ok) {
        // Delete action on success
        if (action.id) {
          await storage.deletePendingAction(action.id);
        }
        console.log(`[Offline] Synced action: ${action.type} ${action.endpoint}`);
      } else {
        console.error(`[Offline] Failed to sync action: ${action.type} ${action.endpoint}`, response.status);
      }
    } catch (err) {
      console.error(`[Offline] Error syncing action: ${action.type} ${action.endpoint}`, err);
    }
  }

  console.log('[Offline] Sync complete');
}

/**
 * Check if online and sync
 */
export function setupOfflineSync(): void {
  if (typeof window === 'undefined') return;

  // Sync when coming online
  window.addEventListener('online', () => {
    console.log('[Offline] Connection restored, syncing...');
    syncPendingActions();
  });

  // Clear expired cache periodically
  setInterval(() => {
    getOfflineStorage().clearExpiredCache();
  }, 3600000); // Every hour
}

