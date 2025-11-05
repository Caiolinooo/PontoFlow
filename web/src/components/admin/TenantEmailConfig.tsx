'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

type EmailProvider = 'smtp' | 'gmail' | 'exchange-oauth2' | 'sendgrid' | 'ses';

interface EmailConfig {
  provider: EmailProvider;
  smtp?: {
    host: string;
    port: number;
    user: string;
    from: string;
    from_name: string;
    secure: boolean;
    has_password: boolean;
  };
  oauth2?: {
    tenant_id: string;
    client_id: string;
    user: string;
    has_secret: boolean;
  };
  sendgrid?: {
    from: string;
    from_name: string;
    has_api_key: boolean;
  };
  ses?: {
    region: string;
    access_key_id: string;
    from: string;
    from_name: string;
    has_secret: boolean;
  };
  deliverability?: {
    spf_record: string;
    dkim_selector: string;
    dkim_domain: string;
    dkim_public_key: string;
    dmarc_policy: string;
    return_path: string;
  };
}

interface TenantInfo {
  tenant_id: string;
  tenant_name: string;
}

export default function TenantEmailConfig() {
  const t = useTranslations('adminSettings.systemConfig');
  
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    provider: 'smtp',
    smtp: {
      host: '',
      port: 587,
      user: '',
      from: '',
      from_name: '',
      secure: true,
      has_password: false,
    },
    deliverability: {
      spf_record: '',
      dkim_selector: '',
      dkim_domain: '',
      dkim_public_key: '',
      dmarc_policy: '',
      return_path: '',
    },
  });
  
  // Form state for passwords/secrets (not loaded from API)
  const [smtpPassword, setSmtpPassword] = useState('');
  const [oauth2ClientSecret, setOauth2ClientSecret] = useState('');
  const [sendgridApiKey, setSendgridApiKey] = useState('');
  const [sesSecretKey, setSesSecretKey] = useState('');
  const [dkimPrivateKey, setDkimPrivateKey] = useState('');
  
  // Test email state
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<any>(null);
  
  // Collapsible sections
  const [deliverabilityExpanded, setDeliverabilityExpanded] = useState(false);

  // Load email configuration on mount
  useEffect(() => {
    loadEmailConfig();
  }, []);

  async function loadEmailConfig() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/email/config', { cache: 'no-store' });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load email configuration');
      }
      
      setTenantInfo({
        tenant_id: data.tenant_id,
        tenant_name: data.tenant_name,
      });
      setEmailConfig(data.email);
    } catch (e: any) {
      console.error('[TenantEmailConfig] Load error:', e);
      setError(e.message || 'Failed to load email configuration');
    } finally {
      setLoading(false);
    }
  }

  async function saveEmailConfig() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: any = {
        provider: emailConfig.provider,
      };

      // Add provider-specific configuration
      if (emailConfig.provider === 'smtp' || emailConfig.provider === 'gmail') {
        payload.smtp = {
          host: emailConfig.smtp?.host || '',
          port: emailConfig.smtp?.port || 587,
          user: emailConfig.smtp?.user || '',
          from: emailConfig.smtp?.from || '',
          from_name: emailConfig.smtp?.from_name || '',
          secure: emailConfig.smtp?.secure ?? true,
        };
        if (smtpPassword) {
          payload.smtp.password = smtpPassword;
        }
      }

      if (emailConfig.provider === 'exchange-oauth2') {
        payload.oauth2 = {
          tenant_id: emailConfig.oauth2?.tenant_id || '',
          client_id: emailConfig.oauth2?.client_id || '',
          user: emailConfig.oauth2?.user || '',
        };
        if (oauth2ClientSecret) {
          payload.oauth2.client_secret = oauth2ClientSecret;
        }
      }

      if (emailConfig.provider === 'sendgrid') {
        payload.sendgrid = {
          from: emailConfig.sendgrid?.from || '',
          from_name: emailConfig.sendgrid?.from_name || '',
        };
        if (sendgridApiKey) {
          payload.sendgrid.api_key = sendgridApiKey;
        }
      }

      if (emailConfig.provider === 'ses') {
        payload.ses = {
          region: emailConfig.ses?.region || 'us-east-1',
          access_key_id: emailConfig.ses?.access_key_id || '',
          from: emailConfig.ses?.from || '',
          from_name: emailConfig.ses?.from_name || '',
        };
        if (sesSecretKey) {
          payload.ses.secret_access_key = sesSecretKey;
        }
      }

      // Add deliverability configuration
      payload.deliverability = emailConfig.deliverability;
      if (dkimPrivateKey) {
        payload.deliverability.dkim_private_key = dkimPrivateKey;
      }

      const response = await fetch('/api/admin/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save email configuration');
      }

      setSuccess('Email configuration saved successfully!');
      // Clear password fields after successful save
      setSmtpPassword('');
      setOauth2ClientSecret('');
      setSendgridApiKey('');
      setSesSecretKey('');
      setDkimPrivateKey('');
      // Reload configuration
      await loadEmailConfig();
    } catch (e: any) {
      console.error('[TenantEmailConfig] Save error:', e);
      setError(e.message || 'Failed to save email configuration');
    } finally {
      setSaving(false);
    }
  }

  async function testEmail() {
    if (!testEmailAddress) {
      setError('Please enter a test email address');
      return;
    }

    setTestingEmail(true);
    setError(null);
    setTestEmailResult(null);
    try {
      const response = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmailAddress }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }

      setTestEmailResult({ success: true, message: 'Test email sent successfully!' });
    } catch (e: any) {
      console.error('[TenantEmailConfig] Test email error:', e);
      setTestEmailResult({ success: false, message: e.message || 'Failed to send test email' });
    } finally {
      setTestingEmail(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tenant Context Header */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Email Configuration for: <span className="font-bold">{tenantInfo?.tenant_name}</span>
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
              This configuration is specific to this tenant and will be used for all emails sent on behalf of this tenant.
            </p>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {/* Email Provider Selection */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Email Provider</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['smtp', 'gmail', 'exchange-oauth2', 'sendgrid', 'ses'] as EmailProvider[]).map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={() => setEmailConfig({ ...emailConfig, provider })}
              className={`p-4 rounded-lg border-2 transition-all ${
                emailConfig.provider === provider
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                  : 'border-[var(--border)] hover:border-[var(--primary)]/50'
              }`}
            >
              <div className="text-sm font-medium text-[var(--foreground)]">
                {provider === 'smtp' && 'SMTP'}
                {provider === 'gmail' && 'Gmail'}
                {provider === 'exchange-oauth2' && 'Exchange OAuth2'}
                {provider === 'sendgrid' && 'SendGrid'}
                {provider === 'ses' && 'Amazon SES'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* SMTP Configuration */}
      {(emailConfig.provider === 'smtp' || emailConfig.provider === 'gmail') && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            {emailConfig.provider === 'gmail' ? 'Gmail' : 'SMTP'} Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                SMTP Host
              </label>
              <input
                type="text"
                value={emailConfig.smtp?.host || ''}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  smtp: { ...emailConfig.smtp!, host: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                placeholder="smtp.office365.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                SMTP Port
              </label>
              <input
                type="number"
                value={emailConfig.smtp?.port || 587}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  smtp: { ...emailConfig.smtp!, port: parseInt(e.target.value) || 587 }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                SMTP User
              </label>
              <input
                type="text"
                value={emailConfig.smtp?.user || ''}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  smtp: { ...emailConfig.smtp!, user: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                placeholder="noreply@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                SMTP Password {emailConfig.smtp?.has_password && <span className="text-xs text-green-600">(configured)</span>}
              </label>
              <input
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                placeholder={emailConfig.smtp?.has_password ? '••••••••' : 'Enter password'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                From Email
              </label>
              <input
                type="email"
                value={emailConfig.smtp?.from || ''}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  smtp: { ...emailConfig.smtp!, from: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                placeholder="noreply@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                From Name
              </label>
              <input
                type="text"
                value={emailConfig.smtp?.from_name || ''}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  smtp: { ...emailConfig.smtp!, from_name: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                placeholder="Company Name"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={emailConfig.smtp?.secure ?? true}
                  onChange={(e) => setEmailConfig({
                    ...emailConfig,
                    smtp: { ...emailConfig.smtp!, secure: e.target.checked }
                  })}
                  className="rounded border-[var(--border)]"
                />
                <span className="text-sm text-[var(--foreground)]">Use TLS/SSL (recommended)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Exchange OAuth2 Configuration */}
      {emailConfig.provider === 'exchange-oauth2' && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Exchange OAuth2 Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Azure Tenant ID
              </label>
              <input
                type="text"
                value={emailConfig.oauth2?.tenant_id || ''}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  oauth2: { ...emailConfig.oauth2!, tenant_id: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Azure Client ID
              </label>
              <input
                type="text"
                value={emailConfig.oauth2?.client_id || ''}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  oauth2: { ...emailConfig.oauth2!, client_id: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Client Secret {emailConfig.oauth2?.has_secret && <span className="text-xs text-green-600">(configured)</span>}
              </label>
              <input
                type="password"
                value={oauth2ClientSecret}
                onChange={(e) => setOauth2ClientSecret(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                placeholder={emailConfig.oauth2?.has_secret ? '••••••••' : 'Enter client secret'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                User Email
              </label>
              <input
                type="email"
                value={emailConfig.oauth2?.user || ''}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  oauth2: { ...emailConfig.oauth2!, user: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                placeholder="noreply@company.com"
              />
            </div>
          </div>
        </div>
      )}

      {/* SendGrid Configuration */}
      {emailConfig.provider === 'sendgrid' && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">SendGrid Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                API Key {emailConfig.sendgrid?.has_api_key && <span className="text-xs text-green-600">(configured)</span>}
              </label>
              <input
                type="password"
                value={sendgridApiKey}
                onChange={(e) => setSendgridApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                placeholder={emailConfig.sendgrid?.has_api_key ? '••••••••' : 'Enter API key'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                From Email
              </label>
              <input
                type="email"
                value={emailConfig.sendgrid?.from || ''}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  sendgrid: { ...emailConfig.sendgrid!, from: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                placeholder="noreply@company.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                From Name
              </label>
              <input
                type="text"
                value={emailConfig.sendgrid?.from_name || ''}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  sendgrid: { ...emailConfig.sendgrid!, from_name: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                placeholder="Company Name"
              />
            </div>
          </div>
        </div>
      )}

      {/* Amazon SES Configuration */}
      {emailConfig.provider === 'ses' && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Amazon SES Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                AWS Region
              </label>
              <select
                value={emailConfig.ses?.region || 'us-east-1'}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  ses: { ...emailConfig.ses!, region: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
              >
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">EU (Ireland)</option>
                <option value="sa-east-1">South America (São Paulo)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Access Key ID
              </label>
              <input
                type="text"
                value={emailConfig.ses?.access_key_id || ''}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  ses: { ...emailConfig.ses!, access_key_id: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                placeholder="AKIAIOSFODNN7EXAMPLE"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Secret Access Key {emailConfig.ses?.has_secret && <span className="text-xs text-green-600">(configured)</span>}
              </label>
              <input
                type="password"
                value={sesSecretKey}
                onChange={(e) => setSesSecretKey(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                placeholder={emailConfig.ses?.has_secret ? '••••••••' : 'Enter secret key'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                From Email
              </label>
              <input
                type="email"
                value={emailConfig.ses?.from || ''}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  ses: { ...emailConfig.ses!, from: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                placeholder="noreply@company.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                From Name
              </label>
              <input
                type="text"
                value={emailConfig.ses?.from_name || ''}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  ses: { ...emailConfig.ses!, from_name: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                placeholder="Company Name"
              />
            </div>
          </div>
        </div>
      )}

      {/* Email Deliverability Configuration (Collapsible) */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setDeliverabilityExpanded(!deliverabilityExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--muted)]/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Email Deliverability & Anti-Spam</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Configure SPF, DKIM, and DMARC to improve email deliverability and prevent spam
              </p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-[var(--muted-foreground)] transition-transform ${deliverabilityExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {deliverabilityExpanded && (
          <div className="px-6 pb-6 space-y-4 border-t border-[var(--border)]">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> These settings help prevent your emails from being marked as spam. Configure your DNS records according to the values below.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                SPF Record
                <span className="text-xs text-[var(--muted-foreground)] ml-2">(Add to your DNS as TXT record)</span>
              </label>
              <textarea
                value={emailConfig.deliverability?.spf_record || ''}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  deliverability: { ...emailConfig.deliverability!, spf_record: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] font-mono text-xs"
                rows={2}
                placeholder="v=spf1 include:spf.protection.outlook.com ~all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  DKIM Selector
                </label>
                <input
                  type="text"
                  value={emailConfig.deliverability?.dkim_selector || ''}
                  onChange={(e) => setEmailConfig({
                    ...emailConfig,
                    deliverability: { ...emailConfig.deliverability!, dkim_selector: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                  placeholder="selector1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  DKIM Domain
                </label>
                <input
                  type="text"
                  value={emailConfig.deliverability?.dkim_domain || ''}
                  onChange={(e) => setEmailConfig({
                    ...emailConfig,
                    deliverability: { ...emailConfig.deliverability!, dkim_domain: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                  placeholder="company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                DKIM Public Key
                <span className="text-xs text-[var(--muted-foreground)] ml-2">(Add to DNS as TXT record: {emailConfig.deliverability?.dkim_selector || 'selector'}._domainkey.{emailConfig.deliverability?.dkim_domain || 'domain.com'})</span>
              </label>
              <textarea
                value={emailConfig.deliverability?.dkim_public_key || ''}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  deliverability: { ...emailConfig.deliverability!, dkim_public_key: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] font-mono text-xs"
                rows={3}
                placeholder="v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                DMARC Policy
                <span className="text-xs text-[var(--muted-foreground)] ml-2">(Add to DNS as TXT record: _dmarc.{emailConfig.deliverability?.dkim_domain || 'domain.com'})</span>
              </label>
              <textarea
                value={emailConfig.deliverability?.dmarc_policy || ''}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  deliverability: { ...emailConfig.deliverability!, dmarc_policy: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] font-mono text-xs"
                rows={2}
                placeholder="v=DMARC1; p=quarantine; rua=mailto:dmarc@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Return Path (Bounce Email)
              </label>
              <input
                type="email"
                value={emailConfig.deliverability?.return_path || ''}
                onChange={(e) => setEmailConfig({
                  ...emailConfig,
                  deliverability: { ...emailConfig.deliverability!, return_path: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
                placeholder="bounce@company.com"
              />
            </div>
          </div>
        )}
      </div>

      {/* Test Email Section */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Test Email Configuration</h3>
        <div className="flex gap-4">
          <input
            type="email"
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
            className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)]"
            placeholder="test@example.com"
          />
          <button
            type="button"
            onClick={testEmail}
            disabled={testingEmail || !testEmailAddress}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testingEmail ? 'Sending...' : 'Send Test Email'}
          </button>
        </div>
        {testEmailResult && (
          <div className={`mt-4 p-4 rounded-lg ${testEmailResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
            <p className={`text-sm ${testEmailResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
              {testEmailResult.message}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={loadEmailConfig}
          disabled={loading || saving}
          className="px-6 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={saveEmailConfig}
          disabled={saving}
          className="px-6 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

