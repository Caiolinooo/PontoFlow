'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  from_name: string;
}

interface TenantSmtpSettingsProps {
  tenantId: string;
  tenantName: string;
}

export default function TenantSmtpSettings({ tenantId, tenantName }: TenantSmtpSettingsProps) {
  const t = useTranslations('admin.smtp');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');

  const [config, setConfig] = useState<SmtpConfig>({
    enabled: false,
    host: '',
    port: 587,
    user: '',
    password: '',
    from: '',
    from_name: tenantName,
  });

  // Load existing SMTP configuration
  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch(`/api/admin/smtp/config?tenantId=${tenantId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.smtp) {
            setConfig({
              ...data.smtp,
              password: '', // Don't load password for security
            });
          }
        }
      } catch (err) {
        console.error('Error loading SMTP config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [tenantId]);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const response = await fetch('/api/admin/smtp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          smtp: config,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save SMTP configuration');
      }

      setSuccess('SMTP configuration saved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save SMTP configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      setError('Please enter a test email address');
      return;
    }

    setError(null);
    setSuccess(null);
    setTesting(true);

    try {
      const response = await fetch('/api/admin/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          testEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'SMTP test failed');
      }

      setSuccess(`Test email sent successfully to ${testEmail}`);
    } catch (err: any) {
      setError(err.message || 'SMTP test failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading SMTP configuration..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">
          SMTP Configuration - {tenantName}
        </h2>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="smtp-enabled"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            className="w-4 h-4"
          />
          <label htmlFor="smtp-enabled" className="text-sm font-medium">
            Enable custom SMTP for this tenant
          </label>
        </div>

        {config.enabled && (
          <>
            {/* SMTP Host */}
            <div>
              <label className="block text-sm font-medium mb-1">
                SMTP Host <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                placeholder="smtp.example.com"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-3 py-2"
                required
              />
            </div>

            {/* SMTP Port */}
            <div>
              <label className="block text-sm font-medium mb-1">
                SMTP Port <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                placeholder="587"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-3 py-2"
                required
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Common ports: 587 (TLS), 465 (SSL), 25 (unsecured)
              </p>
            </div>

            {/* SMTP User */}
            <div>
              <label className="block text-sm font-medium mb-1">
                SMTP Username <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={config.user}
                onChange={(e) => setConfig({ ...config, user: e.target.value })}
                placeholder="noreply@yourdomain.com"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-3 py-2"
                required
              />
            </div>

            {/* SMTP Password */}
            <div>
              <label className="block text-sm font-medium mb-1">
                SMTP Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={config.password}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                placeholder="Enter password"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-3 py-2"
                required
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Password will be encrypted before storage
              </p>
            </div>

            {/* From Email */}
            <div>
              <label className="block text-sm font-medium mb-1">
                From Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={config.from}
                onChange={(e) => setConfig({ ...config, from: e.target.value })}
                placeholder="noreply@yourdomain.com"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-3 py-2"
                required
              />
            </div>

            {/* From Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                From Name
              </label>
              <input
                type="text"
                value={config.from_name}
                onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                placeholder={tenantName}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-3 py-2"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Display name for outgoing emails
              </p>
            </div>
          </>
        )}

        {/* Save Button */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving || (config.enabled && (!config.host || !config.user || !config.from))}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Test Email Section */}
      {config.enabled && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold">Test SMTP Configuration</h3>
          <div>
            <label className="block text-sm font-medium mb-1">
              Test Email Address
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-3 py-2"
            />
          </div>
          <button
            onClick={handleTest}
            disabled={testing || !testEmail}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? 'Sending...' : 'Send Test Email'}
          </button>
        </div>
      )}
    </div>
  );
}

