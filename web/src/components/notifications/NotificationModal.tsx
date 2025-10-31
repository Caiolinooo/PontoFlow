'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useInAppNotifications } from '@/lib/notifications/in-app-notifications';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const { notifications, unreadCount, refreshUnreadCount } = useInAppNotifications();
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'unread'>('unread');

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      refreshUnreadCount();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/list');
      if (response.ok) {
        const data = await response.json();
        // Refresh is handled by the hook
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: notificationIds })
      });
      await refreshUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true })
      });
      await refreshUnreadCount();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/delete?id=${notificationId}`, {
        method: 'DELETE'
      });
      await loadNotifications();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const deleteAll = async () => {
    try {
      await fetch('/api/notifications/delete?all=true', {
        method: 'DELETE'
      });
      await loadNotifications();
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
    }
  };

  const filteredNotifications = selectedTab === 'unread'
    ? notifications.filter(n => !(n as any).read)
    : notifications;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return iconMap[type] || 'ℹ';
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Notifications" size="lg">
      <div className="flex flex-col h-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-4">
            <div className="flex bg-[var(--surface)] rounded-lg p-1">
              <button
                onClick={() => setSelectedTab('unread')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedTab === 'unread'
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                onClick={() => setSelectedTab('all')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedTab === 'all'
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                All ({notifications.length})
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={deleteAll}
                className="text-xs text-[var(--destructive)]"
              >
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-[var(--muted-foreground)]">Loading notifications...</div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-12 h-12 bg-[var(--surface)] rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5V3h10v14z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
                {selectedTab === 'unread' ? 'No unread notifications' : 'No notifications'}
              </h3>
              <p className="text-[var(--muted-foreground)]">
                {selectedTab === 'unread' 
                  ? "You're all caught up!" 
                  : "You don't have any notifications yet."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-[var(--surface)] transition-colors ${
                    !(notification as any).read ? 'bg-[var(--surface-elevated)]/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                        notification.type === 'success' ? 'bg-green-500' :
                        notification.type === 'error' ? 'bg-red-500' :
                        notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className={`text-sm font-medium ${
                            !(notification as any).read ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'
                          }`}>
                            {notification.title}
                          </h4>
                          <p className={`text-sm mt-1 ${
                            !(notification as any).read ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)] mt-2">
                            {formatDate((notification as any).created_at || (notification as any).createdAt)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {!(notification as any).read && (
                            <button
                              onClick={() => markAsRead([notification.id])}
                              className="text-xs text-[var(--primary)] hover:underline"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}