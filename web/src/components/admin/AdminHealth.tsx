"use client";
import React from 'react';

export default function AdminHealth() {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [envChecks, setEnvChecks] = React.useState<any>(null);

  async function run() {
    setLoading(true); setError(null);
    try {
      const r = await fetch('/api/admin/health', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'health_error');
      setData(j);

      // Check additional environment variables
      checkEnvironmentVariables();
    } catch (e: any) {
      setError(e?.message || 'erro');
    } finally { setLoading(false); }
  }

  function checkEnvironmentVariables() {
    const checks = {
      smtp: {
        host: !!process.env.NEXT_PUBLIC_SMTP_HOST || false,
        user: !!process.env.NEXT_PUBLIC_SMTP_USER || false,
        from: !!process.env.NEXT_PUBLIC_MAIL_FROM || false,
      },
      sync: {
        secret: !!process.env.NEXT_PUBLIC_ADMIN_SYNC_SECRET || false,
        sourceUrl: !!process.env.NEXT_PUBLIC_SOURCE_SYSTEM_SYNC_URL || false,
        targetUrl: !!process.env.NEXT_PUBLIC_TARGET_SYSTEM_SYNC_URL || false,
      },
      api: {
        baseUrl: !!process.env.NEXT_PUBLIC_API_BASE_URL || false,
        webhookUrl: !!process.env.NEXT_PUBLIC_WEBHOOK_URL || false,
      }
    };
    setEnvChecks(checks);
  }

  React.useEffect(() => { run(); }, []);

  const Row = ({label, value, ok}: any) => (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className={ok === false ? 'text-red-500' : ok === true ? 'text-green-500' : 'text-amber-500'}>
        {typeof value === 'boolean' ? (value ? 'Configurado' : 'Não configurado') : String(value)}
      </span>
    </div>
  );

  const StatusBadge = ({ ok }: { ok: boolean }) => (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
      ok ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
           'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    }`}>
      {ok ? 'OK' : 'Falha'}
    </span>
  );

  const overallHealth = data &&
    data.env.urlPresent &&
    data.env.anonPresent &&
    data.env.servicePresent &&
    data.checks.serviceConnect?.ok &&
    data.checks.tables.tenants.exists &&
    data.checks.tables.tenant_settings.exists &&
    data.checks.tables.users_unified.exists;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Status Geral</h3>
          {data && <StatusBadge ok={overallHealth} />}
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? 'Verificando...' : 'Reverificar'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">Erro: {error}</p>
        </div>
      )}

      {data && (
        <div className="grid md:grid-cols-3 gap-4">
          {/* Database */}
          <div className="bg-[var(--muted)]/30 rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center justify-between">
              Banco de Dados
              <StatusBadge ok={data.env.urlPresent && data.checks.serviceConnect?.ok} />
            </h4>
            <div className="space-y-1">
              <Row label="URL Supabase" value={data.env.url} ok={data.env.urlPresent} />
              <Row label="Anon Key" value={data.env.anonMasked} ok={data.env.anonPresent} />
              <Row label="Service Key" value={data.env.serviceMasked} ok={data.env.servicePresent} />
              <Row label="Conexão" value={data.checks.serviceConnect?.ok ? 'OK' : 'Falha'} ok={data.checks.serviceConnect?.ok} />
            </div>
          </div>

          {/* Tables */}
          <div className="bg-[var(--muted)]/30 rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center justify-between">
              Tabelas
              <StatusBadge ok={
                data.checks.tables.tenants.exists &&
                data.checks.tables.tenant_settings.exists &&
                data.checks.tables.users_unified.exists
              } />
            </h4>
            <div className="space-y-1">
              <Row label="tenants" value={data.checks.tables.tenants.exists ? 'Existe' : 'Não existe'} ok={data.checks.tables.tenants.exists} />
              <Row label="tenant_settings" value={data.checks.tables.tenant_settings.exists ? 'Existe' : 'Não existe'} ok={data.checks.tables.tenant_settings.exists} />
              <Row label="users_unified" value={data.checks.tables.users_unified.exists ? 'Existe' : 'Não existe'} ok={data.checks.tables.users_unified.exists} />
            </div>
          </div>

          {/* Configuration */}
          <div className="bg-[var(--muted)]/30 rounded-lg p-4">
            <h4 className="font-semibold mb-3">Configurações Opcionais</h4>
            <div className="space-y-1">
              <Row label="SMTP Host" value={envChecks?.smtp.host} ok={envChecks?.smtp.host} />
              <Row label="Sync Secret" value={envChecks?.sync.secret} ok={envChecks?.sync.secret} />
              <Row label="API Base URL" value={envChecks?.api.baseUrl} ok={envChecks?.api.baseUrl} />
            </div>
          </div>
        </div>
      )}

      {!data && !error && (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--muted-foreground)]">Carregando status do sistema...</p>
        </div>
      )}

      {data?.checks?.tables && !overallHealth && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Atenção:</strong> Alguns componentes do sistema não estão configurados corretamente.
            Verifique as variáveis de ambiente e a inicialização do banco de dados.
          </p>
        </div>
      )}
    </div>
  );
}

