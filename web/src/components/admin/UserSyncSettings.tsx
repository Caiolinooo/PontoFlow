'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface UserSyncSettingsProps {
  locale: string;
}

export default function UserSyncSettings({ locale }: UserSyncSettingsProps) {
  const t = useTranslations('adminSettings.userSync');
  const [syncEnabled, setSyncEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load current sync status
  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const response = await fetch('/api/admin/system-config/users-unified-sync');
      if (response.ok) {
        const data = await response.json();
        setSyncEnabled(data.enabled);
      }
    } catch (error) {
      console.error('Error loading sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSync = async (enabled: boolean) => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/system-config/users-unified-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        const data = await response.json();
        setSyncEnabled(data.enabled);
        setMessage({
          type: 'success',
          text: enabled ? t('enabledSuccess') : t('disabledSuccess'),
        });
      } else {
        throw new Error('Failed to update sync setting');
      }
    } catch (error) {
      console.error('Error updating sync setting:', error);
      setMessage({
        type: 'error',
        text: t('updateError'),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('title')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('description')}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Sync Toggle */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <label className="flex items-center space-x-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={syncEnabled || false}
                  onChange={(e) => handleToggleSync(e.target.checked)}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('enableSync')}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {syncEnabled ? t('syncEnabledInfo') : t('syncDisabledInfo')}
                </p>
              </div>
            </label>
          </div>

          {/* Status Badge */}
          <div className="ml-4">
            {syncEnabled ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                ✅ {t('enabled')}
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                ❌ {t('disabled')}
              </span>
            )}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
            ℹ️ {t('infoTitle')}
          </h3>
          <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
            <li>• {t('infoLine1')}</li>
            <li>• {t('infoLine2')}</li>
            <li>• {t('infoLine3')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

