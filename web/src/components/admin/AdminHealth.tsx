"use client";
import React from 'react';

export default function AdminHealth() {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function run() {
    setLoading(true); setError(null);
    try {
      const r = await fetch('/api/admin/health', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'health_error');
      setData(j);
    } catch (e: any) {
      setError(e?.message || 'erro');
    } finally { setLoading(false); }
  }

  React.useEffect(() => { run(); }, []);

  const Row = ({label, value, ok}: any) => (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className={ok === false ? 'text-red-500' : 'text-green-500'}>{String(value)}</span>
    </div>
  );

  return (
    <div className="rounded border p-4 space-y-3 bg-[var(--card)]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Health Check</h2>
        <button onClick={run} disabled={loading} className="px-3 py-1 rounded bg-[var(--primary)] text-[var(--primary-foreground)]">
          {loading ? 'Verificando…' : 'Reverificar'}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {data && (
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Variáveis de ambiente</h3>
            <Row label="URL presente" value={data.env.url} ok={data.env.urlPresent} />
            <Row label="Anon presente" value={data.env.anonMasked} ok={data.env.anonPresent} />
            <Row label="Service presente" value={data.env.serviceMasked} ok={data.env.servicePresent} />
            <Row label="Conexão service" value={data.checks.serviceConnect?.ok} ok={data.checks.serviceConnect?.ok} />
          </div>
          <div>
            <h3 className="font-semibold mb-2">Tabelas</h3>
            <Row label="tenants" value={data.checks.tables.tenants.exists} ok={data.checks.tables.tenants.exists} />
            <Row label="tenant_settings" value={data.checks.tables.tenant_settings.exists} ok={data.checks.tables.tenant_settings.exists} />
            <Row label="users_unified" value={data.checks.tables.users_unified.exists} ok={data.checks.tables.users_unified.exists} />
          </div>
        </div>
      )}
      {!data && !error && <p className="text-sm text-[var(--muted-foreground)]">Carregando…</p>}
      {data?.checks?.tables && (
        <div className="text-xs text-[var(--muted-foreground)]">
          <p>Dica: se aparecer "relation ... does not exist", o banco deste projeto ainda não foi inicializado.</p>
        </div>
      )}
    </div>
  );
}

