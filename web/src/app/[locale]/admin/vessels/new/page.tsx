"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TenantSelectorModal, { TenantOption } from '@/components/admin/TenantSelectorModal';

export default function NewVesselPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const makeReq = async () => {
        const resp = await fetch('/api/admin/vessels', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, code: code || null })
        });
        const j = await resp.json().catch(() => ({}));
        return { resp, j } as const;
      };
      let { resp, j } = await makeReq();
      if (resp.status === 409 && j?.error === 'tenant_required') {
        setTenantOptions(j.tenants || []);
        setTenantModalOpen(true);
        return;
      }
      if (!resp.ok) throw new Error(j?.error || 'Falha ao criar');
      router.push('../vessels');
    } catch (e: any) {
      setError(e?.message || 'Erro inesperado');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-4">Nova Embarcação</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--muted-foreground)] mb-1">Nome</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)]" />
        </div>
        <div>
          <label className="block text-sm text-[var(--muted-foreground)] mb-1">Código</label>
          <input value={code} onChange={e => setCode(e.target.value)} className="w-full px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)]" />
        </div>
        {error && <div className="text-[var(--destructive)] text-sm">{error}</div>}
        <button disabled={saving} className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-60">
          {saving ? 'Salvando...' : 'Criar'}
        </button>
        <TenantSelectorModal
          open={tenantModalOpen}
          tenants={tenantOptions}
          onClose={() => setTenantModalOpen(false)}
          onSelected={async (tenantId) => {
            const resp = await fetch('/api/admin/me/tenant', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: tenantId }) });
            if (!resp.ok) { setError('Falha ao definir tenant'); return; }
            setSaving(true);
            setError(null);
            const { resp: r2, j: j2 } = await (async () => {
              const resp2 = await fetch('/api/admin/vessels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, code: code || null }) });
              const j2 = await resp2.json().catch(() => ({}));
              return { resp: resp2, j: j2 } as const;
            })();
            if (!r2.ok) { setError(j2?.error || 'Falha ao criar'); return; }
            router.push('../vessels');
          }}
        />
      </form>
    </div>
  );
}

