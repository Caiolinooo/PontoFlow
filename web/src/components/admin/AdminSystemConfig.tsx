"use client";
import React, { useState } from 'react';

type DatabaseProvider = 'supabase' | 'postgres' | 'mysql';
type EmailProvider = 'gmail' | 'smtp' | 'sendgrid' | 'ses';
type SyncOperation = 'export' | 'import' | 'test';

export default function AdminSystemConfig() {
  const [activeTab, setActiveTab] = useState<'database' | 'email' | 'sync' | 'migration' | 'endpoints'>('database');

  // Database config
  const [dbProvider, setDbProvider] = useState<DatabaseProvider>('supabase');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnon, setSupabaseAnon] = useState('');
  const [supabaseService, setSupabaseService] = useState('');

  // Email config
  const [emailProvider, setEmailProvider] = useState<EmailProvider>('gmail');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [mailFrom, setMailFrom] = useState('');

  // Sync config
  const [syncSecret, setSyncSecret] = useState('');
  const [sourceSystemUrl, setSourceSystemUrl] = useState('');
  const [targetSystemUrl, setTargetSystemUrl] = useState('');

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

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        throw new Error(result.error || 'Falha ao salvar configurações');
      }

      setMessage({ type: 'success', text: 'Configurações salvas com sucesso. Reinicie o servidor para aplicar as mudanças.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: `Erro: ${error.message}` });
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

  const tabs = [
    { id: 'database' as const, label: 'Banco de Dados' },
    { id: 'email' as const, label: 'E-mail' },
    { id: 'sync' as const, label: 'Sincronização' },
    { id: 'migration' as const, label: 'Migração de Dados' },
    { id: 'endpoints' as const, label: 'Endpoints' },
  ];

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="p-6 border-b border-[var(--border)]">
        <h2 className="text-xl font-semibold">Configurações do Sistema</h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Configure variáveis de ambiente, integrações e sincronização de dados
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
              <h3 className="text-lg font-semibold mb-2">Configuração de Banco de Dados</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Selecione o provedor de banco de dados e configure as credenciais de acesso
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Provedor</label>
              <select
                value={dbProvider}
                onChange={(e) => setDbProvider(e.target.value as DatabaseProvider)}
                className="w-full rounded border p-2 bg-[var(--input)]"
              >
                <option value="supabase">Supabase (PostgreSQL)</option>
                <option value="postgres">PostgreSQL Direto</option>
                <option value="mysql">MySQL</option>
              </select>
            </div>

            {dbProvider === 'supabase' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">NEXT_PUBLIC_SUPABASE_URL</label>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xxxx.supabase.co"
                    className="w-full rounded border p-2 bg-[var(--input)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</label>
                  <input
                    type="password"
                    value={supabaseAnon}
                    onChange={(e) => setSupabaseAnon(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full rounded border p-2 bg-[var(--input)] font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SUPABASE_SERVICE_ROLE_KEY</label>
                  <input
                    type="password"
                    value={supabaseService}
                    onChange={(e) => setSupabaseService(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full rounded border p-2 bg-[var(--input)] font-mono text-xs"
                  />
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Atenção: Nunca exponha a Service Role Key no cliente
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Email Tab */}
        {activeTab === 'email' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Configuração de E-mail</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Configure o serviço de envio de e-mails para notificações do sistema
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Provedor</label>
              <select
                value={emailProvider}
                onChange={(e) => setEmailProvider(e.target.value as EmailProvider)}
                className="w-full rounded border p-2 bg-[var(--input)]"
              >
                <option value="gmail">Gmail (SMTP)</option>
                <option value="smtp">SMTP Genérico</option>
                <option value="sendgrid">SendGrid</option>
                <option value="ses">Amazon SES</option>
              </select>
            </div>

            {(emailProvider === 'gmail' || emailProvider === 'smtp') && (
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">SMTP_HOST</label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder={emailProvider === 'gmail' ? 'smtp.gmail.com' : 'smtp.example.com'}
                      className="w-full rounded border p-2 bg-[var(--input)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">SMTP_PORT</label>
                    <input
                      type="text"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      placeholder="587"
                      className="w-full rounded border p-2 bg-[var(--input)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SMTP_USER</label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="seu-email@gmail.com"
                    className="w-full rounded border p-2 bg-[var(--input)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SMTP_PASS</label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="Senha ou App Password"
                    className="w-full rounded border p-2 bg-[var(--input)]"
                  />
                  {emailProvider === 'gmail' && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Nota: Use uma senha de app do Google (não sua senha normal)
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">MAIL_FROM</label>
                  <input
                    type="text"
                    value={mailFrom}
                    onChange={(e) => setMailFrom(e.target.value)}
                    placeholder='"Sistema" <no-reply@example.com>'
                    className="w-full rounded border p-2 bg-[var(--input)]"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sync Tab */}
        {activeTab === 'sync' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Configuração de Sincronização</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Configure a sincronização bilateral de dados com sistemas externos
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Documentação</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                A sincronização usa autenticação HMAC SHA-256. Consulte{' '}
                <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">docs/SYNC-USERS-BILATERAL.md</code>{' '}
                para detalhes completos sobre a implementação.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">ADMIN_SYNC_SECRET</label>
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
                  Gerar Segredo
                </button>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Segredo compartilhado usado para autenticação HMAC. Deve ser idêntico em ambos os sistemas.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">SOURCE_SYSTEM_SYNC_URL</label>
              <input
                type="text"
                value={sourceSystemUrl}
                onChange={(e) => setSourceSystemUrl(e.target.value)}
                placeholder="https://source-system.example.com/api/admin/sync/user"
                className="w-full rounded border p-2 bg-[var(--input)]"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                URL do endpoint de sincronização do sistema de origem (para enviar eventos)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">TARGET_SYSTEM_SYNC_URL</label>
              <input
                type="text"
                value={targetSystemUrl}
                onChange={(e) => setTargetSystemUrl(e.target.value)}
                placeholder="https://target-system.example.com/api/admin/sync/user"
                className="w-full rounded border p-2 bg-[var(--input)]"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                URL do endpoint de sincronização do sistema de destino (para receber eventos)
              </p>
            </div>
          </div>
        )}

        {/* Migration Tab */}
        {activeTab === 'migration' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Migração e Clonagem de Dados</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Exporte, importe ou teste a conexão com sistemas externos
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">Atenção</h4>
              <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                <li>Execute operações de migração fora do horário de pico</li>
                <li>Faça backup do banco de dados antes de importar</li>
                <li>Teste a conexão antes de executar operações em massa</li>
                <li>O segredo HMAC deve ser idêntico em ambos os sistemas</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Operação</label>
              <select
                value={operation}
                onChange={(e) => setOperation(e.target.value as SyncOperation)}
                className="w-full rounded border p-2 bg-[var(--input)]"
              >
                <option value="export">Exportar usuários deste sistema</option>
                <option value="import">Importar usuários de outro sistema</option>
                <option value="test">Testar conexão com outro sistema</option>
              </select>
            </div>

            {(operation === 'import' || operation === 'test') && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  URL do Sistema {operation === 'import' ? 'de Origem' : 'Alvo'}
                </label>
                <input
                  type="text"
                  value={migrationUrl}
                  onChange={(e) => setMigrationUrl(e.target.value)}
                  placeholder="https://example.com/api/admin/sync/users/export"
                  className="w-full rounded border p-2 bg-[var(--input)]"
                />
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {operation === 'import'
                    ? 'URL do endpoint /api/admin/sync/users/export do sistema de origem'
                    : 'URL do endpoint /api/admin/sync/user do sistema alvo'}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Segredo HMAC</label>
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
                  Gerar
                </button>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Mesmo segredo configurado em ambos os sistemas (ADMIN_SYNC_SECRET)
              </p>
            </div>

            <button
              onClick={executeMigration}
              disabled={migrationLoading || !migrationSecret}
              className="w-full px-6 py-3 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-90 disabled:opacity-50"
            >
              {migrationLoading ? 'Processando...' : `Executar ${operation === 'export' ? 'Exportação' : operation === 'import' ? 'Importação' : 'Teste'}`}
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
                    {migrationResult.type === 'export' ? 'Exportação' : migrationResult.type === 'import' ? 'Importação' : 'Teste'} Concluída
                  </h4>
                  {migrationResult.type === 'export' && migrationResult.users && (
                    <button
                      onClick={downloadExport}
                      className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-sm font-medium"
                    >
                      Baixar JSON
                    </button>
                  )}
                </div>

                <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  {migrationResult.type === 'export' && (
                    <>
                      <p>Total de usuários exportados: <strong>{migrationResult.count}</strong></p>
                      <p className="text-xs">Os dados estão prontos para importação em outro sistema</p>
                    </>
                  )}
                  {migrationResult.type === 'import' && (
                    <>
                      <p>Total de usuários importados: <strong>{migrationResult.count}</strong></p>
                      <p className="text-xs">{migrationResult.message}</p>
                    </>
                  )}
                  {migrationResult.type === 'test' && (
                    <>
                      <p>Status: <strong>{migrationResult.status}</strong></p>
                      <p>Código HTTP: <strong>{migrationResult.statusCode}</strong></p>
                      <p className="text-xs">{migrationResult.message}</p>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--border)]">
              <h4 className="font-medium mb-2">Endpoints Disponíveis</h4>
              <div className="space-y-2 text-sm font-mono bg-[var(--muted)]/30 p-3 rounded">
                <div><span className="text-green-600">POST</span> /api/admin/sync/users/export</div>
                <div><span className="text-blue-600">POST</span> /api/admin/sync/users/import</div>
                <div><span className="text-purple-600">POST</span> /api/admin/sync/user</div>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                Consulte <code>docs/SYNC-USERS-BILATERAL.md</code> para documentação completa
              </p>
            </div>
          </div>
        )}

        {/* Endpoints Tab */}
        {activeTab === 'endpoints' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Configuração de Endpoints</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Configure URLs base e webhooks para integrações externas
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">NEXT_PUBLIC_API_BASE_URL</label>
              <input
                type="text"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="https://api.example.com"
                className="w-full rounded border p-2 bg-[var(--input)]"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                URL base da API (opcional, padrão: mesma origem)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">WEBHOOK_URL</label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://webhook.example.com/events"
                className="w-full rounded border p-2 bg-[var(--input)]"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                URL para receber webhooks de eventos do sistema
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
                className="px-6 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>

              {message && (
                <div className={`text-sm ${message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {message.text}
                </div>
              )}
            </div>

            <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
              Atenção: Em produção, edite as variáveis de ambiente diretamente no provedor (Vercel, Render, etc.)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

