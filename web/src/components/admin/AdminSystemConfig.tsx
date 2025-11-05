"use client";
import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import TenantEmailConfig from './TenantEmailConfig';

type DatabaseProvider = 'supabase' | 'postgres' | 'mysql';
type EmailProvider = 'gmail' | 'smtp' | 'sendgrid' | 'ses' | 'exchange-oauth2';
type SyncOperation = 'export' | 'import' | 'test';

export default function AdminSystemConfig() {
  const t = useTranslations('adminSettings.systemConfig');
  const [activeTab, setActiveTab] = useState<'database' | 'email' | 'sync' | 'migration' | 'endpoints'>('database');

  // Loading state
  const [loading, setLoading] = useState(true);

  // Database config
  const [dbProvider, setDbProvider] = useState<DatabaseProvider>('supabase');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnon, setSupabaseAnon] = useState('');
  const [supabaseService, setSupabaseService] = useState('');
  const [dbConfigured, setDbConfigured] = useState({
    url: false,
    anon: false,
    service: false
  });

  // Email config
  const [emailProvider, setEmailProvider] = useState<EmailProvider>('gmail');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [mailFrom, setMailFrom] = useState('');
  const [emailConfigured, setEmailConfigured] = useState({
    host: false,
    port: false,
    user: false,
    pass: false,
    from: false
  });

  // OAuth2 config (Exchange)
  const [azureTenantId, setAzureTenantId] = useState('');
  const [azureClientId, setAzureClientId] = useState('');
  const [azureClientSecret, setAzureClientSecret] = useState('');
  const [oauth2Configured, setOauth2Configured] = useState({
    tenantId: false,
    clientId: false,
    clientSecret: false
  });

  // Sync config
  const [syncSecret, setSyncSecret] = useState('');
  const [sourceSystemUrl, setSourceSystemUrl] = useState('');
  const [targetSystemUrl, setTargetSystemUrl] = useState('');
  const [syncConfigured, setSyncConfigured] = useState({
    secret: false,
    sourceUrl: false,
    targetUrl: false
  });

  // Migration
  const [operation, setOperation] = useState<SyncOperation>('export');
  const [migrationUrl, setMigrationUrl] = useState('');
  const [migrationSecret, setMigrationSecret] = useState('');
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  // Endpoints config
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [endpointsConfigured, setEndpointsConfigured] = useState({
    apiBaseUrl: false,
    webhookUrl: false
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Email test states
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<any>(null);
  const [emailTestError, setEmailTestError] = useState<string | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendTestEmail, setSendTestEmail] = useState(false);

  // Load current configuration on mount
  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/config/env');
      if (!response.ok) {
        throw new Error('Falha ao carregar configurações');
      }

      const { config } = await response.json();

      // Database config
      if (config.database) {
        setSupabaseUrl(config.database.url || '');
        setSupabaseAnon(config.database.anonKey || '');
        setSupabaseService(config.database.serviceKey || '');
        setDbConfigured({
          url: config.database.urlConfigured,
          anon: config.database.anonKeyConfigured,
          service: config.database.serviceKeyConfigured
        });
      }

      // Email config
      if (config.email) {
        const provider = config.email.provider === 'oauth2' ? 'exchange-oauth2' : 'gmail';
        setEmailProvider(provider);

        if (config.email.smtp) {
          setSmtpHost(config.email.smtp.host || '');
          setSmtpPort(config.email.smtp.port || '587');
          setSmtpUser(config.email.smtp.user || '');
          setSmtpPass(config.email.smtp.pass || '');
          setMailFrom(config.email.smtp.from || '');
          setEmailConfigured({
            host: config.email.smtp.hostConfigured,
            port: config.email.smtp.portConfigured,
            user: config.email.smtp.userConfigured,
            pass: config.email.smtp.passConfigured,
            from: config.email.smtp.fromConfigured
          });
        }

        if (config.email.oauth2) {
          setAzureTenantId(config.email.oauth2.tenantId || '');
          setAzureClientId(config.email.oauth2.clientId || '');
          setAzureClientSecret(config.email.oauth2.clientSecret || '');
          setOauth2Configured({
            tenantId: config.email.oauth2.tenantIdConfigured,
            clientId: config.email.oauth2.clientIdConfigured,
            clientSecret: config.email.oauth2.clientSecretConfigured
          });
        }
      }

      // Sync config
      if (config.sync) {
        setSyncSecret(config.sync.secret || '');
        setSourceSystemUrl(config.sync.sourceUrl || '');
        setTargetSystemUrl(config.sync.targetUrl || '');
        setSyncConfigured({
          secret: config.sync.secretConfigured,
          sourceUrl: config.sync.sourceUrlConfigured,
          targetUrl: config.sync.targetUrlConfigured
        });
      }

      // Endpoints config
      if (config.endpoints) {
        setApiBaseUrl(config.endpoints.apiBaseUrl || '');
        setWebhookUrl(config.endpoints.webhookUrl || '');
        setEndpointsConfigured({
          apiBaseUrl: config.endpoints.apiBaseUrlConfigured,
          webhookUrl: config.endpoints.webhookUrlConfigured
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
      setMessage({ type: 'error', text: `Erro ao carregar configurações: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const config: Record<string, string> = {};
      
      // Database config
      if (dbProvider === 'supabase') {
        if (supabaseUrl) config.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
        if (supabaseAnon) config.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnon;
        if (supabaseService) config.SUPABASE_SERVICE_ROLE_KEY = supabaseService;
      }
      
      // Email config
      if (emailProvider === 'gmail' || emailProvider === 'smtp') {
        if (smtpHost) config.SMTP_HOST = smtpHost;
        if (smtpPort) config.SMTP_PORT = smtpPort;
        if (smtpUser) config.SMTP_USER = smtpUser;
        if (smtpPass) config.SMTP_PASS = smtpPass;
        if (mailFrom) config.MAIL_FROM = mailFrom;
      } else if (emailProvider === 'exchange-oauth2') {
        config.EMAIL_PROVIDER = 'oauth2';
        if (azureTenantId) config.AZURE_TENANT_ID = azureTenantId;
        if (azureClientId) config.AZURE_CLIENT_ID = azureClientId;
        if (azureClientSecret) config.AZURE_CLIENT_SECRET = azureClientSecret;
        if (mailFrom) config.MAIL_FROM = mailFrom;
      }
      
      // Sync config
      if (syncSecret) config.ADMIN_SYNC_SECRET = syncSecret;
      if (sourceSystemUrl) config.SOURCE_SYSTEM_SYNC_URL = sourceSystemUrl;
      if (targetSystemUrl) config.TARGET_SYSTEM_SYNC_URL = targetSystemUrl;
      
      // Endpoints config
      if (apiBaseUrl) config.NEXT_PUBLIC_API_BASE_URL = apiBaseUrl;
      if (webhookUrl) config.WEBHOOK_URL = webhookUrl;

      const response = await fetch('/api/admin/config/env', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('saveError'));
      }

      setMessage({ type: 'success', text: t('saveSuccess') });
    } catch (error: any) {
      setMessage({ type: 'error', text: `${t('saveError')}: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const generateSyncSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    setSyncSecret(hex);
  };

  const generateMigrationSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    setMigrationSecret(hex);
  };

  const generateHmac = async (data: string, secret: string): Promise<string> => {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const executeMigration = async () => {
    setMigrationLoading(true);
    setMigrationError(null);
    setMigrationResult(null);

    try {
      if (operation === 'export') {
        const response = await fetch('/api/admin/sync/users/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sync-signature': `sha256=${await generateHmac('{}', migrationSecret)}`
          },
          body: '{}'
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Falha ao exportar');
        }

        setMigrationResult({
          type: 'export',
          count: data.users?.length || 0,
          users: data.users
        });
      } else if (operation === 'import') {
        if (!migrationUrl) {
          throw new Error('URL do sistema de origem é obrigatória');
        }

        const exportResponse = await fetch(migrationUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sync-signature': `sha256=${await generateHmac('{}', migrationSecret)}`
          },
          body: '{}'
        });

        const exportData = await exportResponse.json();

        if (!exportResponse.ok) {
          throw new Error(exportData.error || 'Falha ao exportar do sistema de origem');
        }

        const importPayload = JSON.stringify({ users: exportData.users });
        const importResponse = await fetch('/api/admin/sync/users/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sync-signature': `sha256=${await generateHmac(importPayload, migrationSecret)}`
          },
          body: importPayload
        });

        const importData = await importResponse.json();

        if (!importResponse.ok) {
          throw new Error(importData.error || 'Falha ao importar');
        }

        setMigrationResult({
          type: 'import',
          count: importData.count || 0,
          message: 'Importação concluída com sucesso'
        });
      } else if (operation === 'test') {
        if (!migrationUrl) {
          throw new Error('URL do sistema alvo é obrigatória');
        }

        const testPayload = JSON.stringify({ action: 'test' });
        const response = await fetch(migrationUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sync-signature': `sha256=${await generateHmac(testPayload, migrationSecret)}`
          },
          body: testPayload
        });

        const data = await response.json();

        setMigrationResult({
          type: 'test',
          status: response.ok ? 'success' : 'failed',
          statusCode: response.status,
          message: response.ok ? 'Conexão bem-sucedida' : data.error || 'Falha na conexão'
        });
      }
    } catch (err: any) {
      setMigrationError(err.message || 'Erro desconhecido');
    } finally {
      setMigrationLoading(false);
    }
  };

  const downloadExport = () => {
    if (!migrationResult?.users) return;

    const dataStr = JSON.stringify(migrationResult.users, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const testEmailConfiguration = async () => {
    setEmailTestLoading(true);
    setEmailTestError(null);
    setEmailTestResult(null);

    try {
      const config: any = {
        provider: emailProvider,
        sendTestEmail: sendTestEmail && testEmailAddress,
        testEmail: testEmailAddress
      };

      // Add SMTP config
      if (emailProvider === 'gmail' || emailProvider === 'smtp') {
        config.host = smtpHost || (emailProvider === 'gmail' ? 'smtp.gmail.com' : '');
        config.port = parseInt(smtpPort) || 587;
        config.user = smtpUser;
        config.pass = smtpPass;
        config.from = mailFrom;
      } else if (emailProvider === 'exchange-oauth2') {
        config.azureTenantId = azureTenantId;
        config.azureClientId = azureClientId;
        config.azureClientSecret = azureClientSecret;
        config.from = mailFrom;
        config.user = smtpUser; // Use as the email that will send
      }

      const response = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Teste de configuração falhou');
      }

      setEmailTestResult(result);
    } catch (error: any) {
      setEmailTestError(error.message);
    } finally {
      setEmailTestLoading(false);
    }
  };

  const tabs = [
    { id: 'database' as const, label: t('database.title') },
    { id: 'email' as const, label: t('email.title') },
    { id: 'sync' as const, label: t('sync.title') },
    { id: 'migration' as const, label: t('migration.title') },
    { id: 'endpoints' as const, label: t('endpoints.title') },
  ];

  // Helper component to show configuration status
  const ConfigStatus = ({ configured }: { configured: boolean }) => (
    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
      configured
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    }`}>
      {configured ? '✓ Configurado' : '⚠ Não configurado'}
    </span>
  );

  if (loading) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
          <span className="ml-3 text-[var(--muted-foreground)]">Carregando configurações...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="p-6 border-b border-[var(--border)]">
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {t('subtitle')}
        </p>
      </div>

      <div className="border-b border-[var(--border)]">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Database Tab */}
        {activeTab === 'database' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('database.title')}</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                {t('database.subtitle')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('database.provider')}</label>
              <select
                value={dbProvider}
                onChange={(e) => setDbProvider(e.target.value as DatabaseProvider)}
                className="w-full rounded border p-2 bg-[var(--input)]"
              >
                <option value="supabase">{t('database.supabase')}</option>
                <option value="postgres">{t('database.postgres')}</option>
                <option value="mysql">{t('database.mysql')}</option>
              </select>
            </div>

            {dbProvider === 'supabase' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    NEXT_PUBLIC_SUPABASE_URL
                    <ConfigStatus configured={dbConfigured.url} />
                  </label>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xxxx.supabase.co"
                    className="w-full rounded border p-2 bg-[var(--input)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    NEXT_PUBLIC_SUPABASE_ANON_KEY
                    <ConfigStatus configured={dbConfigured.anon} />
                  </label>
                  <input
                    type="password"
                    value={supabaseAnon}
                    onChange={(e) => setSupabaseAnon(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full rounded border p-2 bg-[var(--input)] font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    SUPABASE_SERVICE_ROLE_KEY
                    <ConfigStatus configured={dbConfigured.service} />
                  </label>
                  <input
                    type="password"
                    value={supabaseService}
                    onChange={(e) => setSupabaseService(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full rounded border p-2 bg-[var(--input)] font-mono text-xs"
                  />
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    {t('database.warning')}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Email Tab */}
        {activeTab === 'email' && (
          <TenantEmailConfig />
        )}

        {/* Sync Tab */}
        {activeTab === 'sync' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('sync.title')}</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                {t('sync.subtitle')}
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">{t('sync.documentation')}</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {t('sync.documentationText')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                ADMIN_SYNC_SECRET
                <ConfigStatus configured={syncConfigured.secret} />
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={syncSecret}
                  onChange={(e) => setSyncSecret(e.target.value)}
                  placeholder="Segredo compartilhado HMAC (hex 64 chars)"
                  className="flex-1 rounded border p-2 bg-[var(--input)] font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={generateSyncSecret}
                  className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm font-medium whitespace-nowrap"
                >
                  {t('sync.generateSecret')}
                </button>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {t('sync.secretHelp')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                SOURCE_SYSTEM_SYNC_URL
                <ConfigStatus configured={syncConfigured.sourceUrl} />
              </label>
              <input
                type="text"
                value={sourceSystemUrl}
                onChange={(e) => setSourceSystemUrl(e.target.value)}
                placeholder="https://source-system.example.com/api/admin/sync/user"
                className="w-full rounded border p-2 bg-[var(--input)]"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {t('sync.sourceUrl')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                TARGET_SYSTEM_SYNC_URL
                <ConfigStatus configured={syncConfigured.targetUrl} />
              </label>
              <input
                type="text"
                value={targetSystemUrl}
                onChange={(e) => setTargetSystemUrl(e.target.value)}
                placeholder="https://target-system.example.com/api/admin/sync/user"
                className="w-full rounded border p-2 bg-[var(--input)]"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {t('sync.targetUrl')}
              </p>
            </div>
          </div>
        )}

        {/* Migration Tab */}
        {activeTab === 'migration' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('migration.title')}</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                {t('migration.subtitle')}
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">{t('migration.warning')}</h4>
              <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                {t.raw('migration.warningItems').map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('migration.operation')}</label>
              <select
                value={operation}
                onChange={(e) => setOperation(e.target.value as SyncOperation)}
                className="w-full rounded border p-2 bg-[var(--input)]"
              >
                <option value="export">{t('migration.export')}</option>
                <option value="import">{t('migration.import')}</option>
                <option value="test">{t('migration.test')}</option>
              </select>
            </div>

            {(operation === 'import' || operation === 'test') && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('migration.urlLabel')}
                </label>
                <input
                  type="text"
                  value={migrationUrl}
                  onChange={(e) => setMigrationUrl(e.target.value)}
                  placeholder="https://example.com/api/admin/sync/users/export"
                  className="w-full rounded border p-2 bg-[var(--input)]"
                />
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {operation === 'import' ? t('migration.urlHelp') : t('migration.urlHelpTest')}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">{t('migration.secretLabel')}</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={migrationSecret}
                  onChange={(e) => setMigrationSecret(e.target.value)}
                  placeholder="Segredo compartilhado HMAC"
                  className="flex-1 rounded border p-2 bg-[var(--input)] font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={generateMigrationSecret}
                  className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm font-medium whitespace-nowrap"
                >
                  {t('sync.generateSecret')}
                </button>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {t('migration.secretHelp')}
              </p>
            </div>

            <button
              onClick={executeMigration}
              disabled={migrationLoading || !migrationSecret}
              className="w-full px-6 py-3 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-90 disabled:opacity-50"
            >
              {migrationLoading ? t('migration.executing') : t('migration.execute')}
            </button>

            {migrationError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-200">Erro: {migrationError}</p>
              </div>
            )}

            {migrationResult && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-green-900 dark:text-green-100">
                    {t('migration.completed')}
                  </h4>
                  {migrationResult.type === 'export' && migrationResult.users && (
                    <button
                      onClick={downloadExport}
                      className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-sm font-medium"
                    >
                      {t('migration.downloadJson')}
                    </button>
                  )}
                </div>

                <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  {migrationResult.type === 'export' && (
                    <>
                      <p>{t('migration.totalExported')} <strong>{migrationResult.count}</strong></p>
                      <p className="text-xs">{t('migration.exportReady')}</p>
                    </>
                  )}
                  {migrationResult.type === 'import' && (
                    <>
                      <p>{t('migration.totalImported')} <strong>{migrationResult.count}</strong></p>
                      <p className="text-xs">{migrationResult.message}</p>
                    </>
                  )}
                  {migrationResult.type === 'test' && (
                    <>
                      <p>{t('migration.status')} <strong>{migrationResult.status}</strong></p>
                      <p>{t('migration.httpCode')} <strong>{migrationResult.statusCode}</strong></p>
                      <p className="text-xs">{migrationResult.message}</p>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--border)]">
              <h4 className="font-medium mb-2">{t('migration.endpoints')}</h4>
              <div className="space-y-2 text-sm font-mono bg-[var(--muted)]/30 p-3 rounded">
                <div><span className="text-green-600">POST</span> /api/admin/sync/users/export</div>
                <div><span className="text-blue-600">POST</span> /api/admin/sync/users/import</div>
                <div><span className="text-purple-600">POST</span> /api/admin/sync/user</div>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                {t('migration.endpointsHelp')}
              </p>
            </div>
          </div>
        )}

        {/* Endpoints Tab */}
        {activeTab === 'endpoints' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('endpoints.title')}</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                {t('endpoints.subtitle')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                NEXT_PUBLIC_API_BASE_URL
                <ConfigStatus configured={endpointsConfigured.apiBaseUrl} />
              </label>
              <input
                type="text"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="https://api.example.com"
                className="w-full rounded border p-2 bg-[var(--input)]"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {t('endpoints.apiBaseUrl')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                WEBHOOK_URL
                <ConfigStatus configured={endpointsConfigured.webhookUrl} />
              </label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://webhook.example.com/events"
                className="w-full rounded border p-2 bg-[var(--input)]"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {t('endpoints.webhookUrl')}
              </p>
            </div>
          </div>
        )}

        {/* Save Button and Messages */}
        {activeTab !== 'migration' && (
          <div className="pt-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-4">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? t('save') + '...' : t('save')}
              </button>

              {message && (
                <div className={`text-sm ${message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {message.text}
                </div>
              )}
            </div>

            <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
              {t('productionWarning')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

