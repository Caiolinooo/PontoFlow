"use client";

import { useEffect, useMemo, useState } from 'react';

type Item = { id: string; label: string };

export default function TenantAssociationsPage() {
  const [members, setMembers] = useState<Item[]>([]);
  const [candidates, setCandidates] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const [selMembers, setSelMembers] = useState<Record<string, boolean>>({});
  const [selCandidates, setSelCandidates] = useState<Record<string, boolean>>({});

  async function load() {
    try {
      setLoading(true);
      const r = await fetch('/api/admin/tenants/associations', { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 409 && j?.error === 'tenant_required') {
        alert('Defina um tenant no topo (Tenant Switcher) para continuar.');
        return;
      }
      if (!r.ok) throw new Error(j?.error || 'Falha ao carregar associações');
      setTenantId(j?.tenant_id || null);
      setMembers(j?.members || []);
      setCandidates(j?.candidates || []);
    } catch (e: any) { setError(e?.message || 'Erro inesperado'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const selectedMembers = useMemo(() => Object.keys(selMembers).filter(id => selMembers[id]), [selMembers]);
  const selectedCandidates = useMemo(() => Object.keys(selCandidates).filter(id => selCandidates[id]), [selCandidates]);

  async function apply(add: string[], remove: string[]) {
    try {
      setError(null);
      const resp = await fetch('/api/admin/tenants/associations', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ add, remove })
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(j?.error || 'Falha ao aplicar alterações');
      setSelMembers({}); setSelCandidates({});
      await load();
    } catch (e: any) { setError(e?.message || 'Erro inesperado'); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Associações de Funcionários ao Tenant</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Defina quais funcionários pertencem ao tenant atual.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-[var(--muted-foreground)]">Carregando...</div>
      ) : error ? (
        <div className="text-[var(--destructive)]">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-[var(--border)] rounded-xl bg-[var(--card)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div>
                <div className="font-medium">Funcionários do Tenant</div>
                <div className="text-xs text-[var(--muted-foreground)]">Tenant: {tenantId || '—'}</div>
              </div>
              <button className="text-sm px-2 py-1.5 rounded-md bg-[var(--muted)]" disabled={selectedMembers.length === 0} onClick={() => apply([], selectedMembers)}>Remover do tenant</button>
            </div>
            <ul className="max-h-[60vh] overflow-auto divide-y divide-[var(--border)]">
              {members.length === 0 && <li className="px-4 py-3 text-[var(--muted-foreground)]">Nenhum funcionário neste tenant.</li>}
              {members.map(m => (
                <li key={m.id} className="flex items-center gap-2 px-4 py-2">
                  <input type="checkbox" checked={!!selMembers[m.id]} onChange={e => setSelMembers(s => ({ ...s, [m.id]: e.target.checked }))} />
                  <span className="text-sm">{m.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-[var(--border)] rounded-xl bg-[var(--card)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div>
                <div className="font-medium">Sem Tenant</div>
                <div className="text-xs text-[var(--muted-foreground)]">Funcionários ainda não associados</div>
              </div>
              <button className="text-sm px-2 py-1.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)]" disabled={selectedCandidates.length === 0} onClick={() => apply(selectedCandidates, [])}>Adicionar ao tenant</button>
            </div>
            <ul className="max-h-[60vh] overflow-auto divide-y divide-[var(--border)]">
              {candidates.length === 0 && <li className="px-4 py-3 text-[var(--muted-foreground)]">Nenhum funcionário disponível.</li>}
              {candidates.map(c => (
                <li key={c.id} className="flex items-center gap-2 px-4 py-2">
                  <input type="checkbox" checked={!!selCandidates[c.id]} onChange={e => setSelCandidates(s => ({ ...s, [c.id]: e.target.checked }))} />
                  <span className="text-sm">{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

