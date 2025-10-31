'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { usePushNotifications } from '@/lib/push/usePushNotifications';
import Alert from '@/components/ui/Alert';

export default function NotificationPreferencesPanel() {
  const t = useTranslations();
  const { supported, subscribed, loading, error, subscribe, unsubscribe } = usePushNotifications();
  const [preferences, setPreferences] = React.useState({
    emailNotifications: true,
    pushNotifications: false,
    deadlineReminders: true,
    approvalNotifications: true,
    rejectionNotifications: true,
  });
  const [saving, setSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    // Load preferences from API on mount (and when locale changes)
    (async () => {
      try {
        const res = await fetch('/api/notifications/preferences');
        if (!res.ok) throw new Error('Failed to load preferences');
        const data = await res.json();
        const prefs = data.preferences as typeof preferences;
        setPreferences((prev) => ({ ...prev, ...prefs, pushNotifications: prev.pushNotifications || prefs.pushNotifications }));
      } catch {
        setLoadError(t('errors.generic') || 'Falha ao carregar preferencias.');
      }
    })();
  }, [t]);

  // Sync push state if subscription changes externally
  React.useEffect(() => {
    setPreferences((prev) => ({ ...prev, pushNotifications: subscribed }));
  }, [subscribed]);

  const handlePushToggle = async () => {
    if (subscribed) {
      await unsubscribe();
      setPreferences((prev) => ({ ...prev, pushNotifications: false }));
    } else {
      const success = await subscribe();
      if (success) {
        setPreferences((prev) => ({ ...prev, pushNotifications: true }));
      }
    }
  };

  const handlePreferenceChange = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setSaved(true);
    } catch {
      setSaveError(t('errors.generic') || 'Falha ao salvar preferencias.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {(error || loadError || saveError) && (
        <Alert variant="error">{error || loadError || saveError}</Alert>
      )}
      {saved && (
        <Alert variant="success" role="status">
          {t('messages.saved') || 'Preferncias salvas com sucesso.'}
        </Alert>
      )}

      {/* Email Notifications */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm p-4 text-[var(--foreground)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-[var(--card-foreground)]">{t('notifications.emailNotifications') || 'Email Notifications'}</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              {t('notifications.emailNotificationsDesc') || 'Receive notifications via email'}
            </p>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.emailNotifications}
              onChange={() => handlePreferenceChange('emailNotifications')}
              className="w-4 h-4"
            />
          </label>
        </div>
      </div>

      {/* Push Notifications */}
      {supported && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm p-4 text-[var(--foreground)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-[var(--card-foreground)]">{t('notifications.pushNotifications') || 'Push Notifications'}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {t('notifications.pushNotificationsDesc') || 'Receive browser notifications'}
              </p>
            </div>
            <button
              onClick={async () => {
                await handlePushToggle();
                // Reflect latest push state in preferences
                setPreferences((prev) => ({ ...prev, pushNotifications: !subscribed }));
                setSaved(false);
              }}
              disabled={loading}
              className={`px-4 py-2 rounded font-medium text-sm ${
                subscribed
                  ? 'bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90'
                  : 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90'
              } disabled:opacity-50`}
            >
              {loading
                ? t('notifications.loading') || 'Loading...'
                : subscribed
                  ? t('notifications.unsubscribe') || 'Unsubscribe'
                  : t('notifications.subscribe') || 'Subscribe'}
            </button>
          </div>
        </div>
      )}

      {!supported && (
        <Alert variant="warning" role="status">{t('notifications.notSupported') || 'Push notifications are not supported in your browser'}</Alert>
      )}

      {/* Deadline Reminders */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm p-4 text-[var(--foreground)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-[var(--card-foreground)]">{t('notifications.deadlineReminders') || 'Deadline Reminders'}</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              {t('notifications.deadlineRemindersDesc') || 'Get reminded before deadline'}
            </p>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.deadlineReminders}
              onChange={() => handlePreferenceChange('deadlineReminders')}
              className="w-4 h-4"
            />
          </label>
        </div>
      </div>

      {/* Approval Notifications */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm p-4 text-[var(--foreground)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-[var(--card-foreground)]">{t('notifications.approvalNotifications') || 'Approval Notifications'}</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              {t('notifications.approvalNotificationsDesc') || 'Get notified when timesheet is approved'}
            </p>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.approvalNotifications}
              onChange={() => handlePreferenceChange('approvalNotifications')}
              className="w-4 h-4"
            />
          </label>
        </div>
      </div>

      {/* Rejection Notifications */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm p-4 text-[var(--foreground)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-[var(--card-foreground)]">{t('notifications.rejectionNotifications') || 'Rejection Notifications'}</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              {t('notifications.rejectionNotificationsDesc') || 'Get notified when timesheet is rejected'}
            </p>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.rejectionNotifications}
              onChange={() => handlePreferenceChange('rejectionNotifications')}
              className="w-4 h-4"
            />
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? (t('actions.saving') || 'Saving...') : (t('actions.save') || 'Save Preferences')}
        </button>
      </div>
    </div>
  );
}

