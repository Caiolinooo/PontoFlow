"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import TenantSelectorModal, { TenantOption } from '@/components/admin/TenantSelectorModal';

export default function EnvironmentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/admin/environments', { cache: 'no-store' });
        const j = await resp.json().catch(() => ({}));
        if (resp.status === 409 && j?.error === 'tenant_required') {
          setTenantOptions(j.tenants || []);
          setTenantModalOpen(true);
          return;
        }
        if (!resp.ok) throw new Error(j?.error || 'Falha ao carregar ambientes');
        setRows(j.environments || []);
      } catch (e: any) {
        setError(e?.message || 'Erro inesperado');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Ambientes</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Ambientes de trabalho (contexto p/ grupos).</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)]" onClick={async () => {
            try {
              setError(null);
              const r = await fetch('/api/admin/me/tenant', { method: 'GET', cache: 'no-store' });
              const j = await r.json().catch(() => ({}));
              if (!r.ok) throw new Error(j?.error || 'Falha ao carregar tenants');
              setTenantOptions(j?.tenants || []);
              setTenantModalOpen(true);
            } catch (e: any) { setError(e?.message || 'Falha ao carregar tenants'); }
          }}>Selecionar tenant</button>
          <Link href="./environments/new" className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90">Novo</Link>
        </div>
      </div>

      {loading ? (
        <div className="text-[var(--muted-foreground)]">Carregando...</div>
      ) : error ? (
        <div className="text-[var(--destructive)]">{error}</div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
              <tr>
                <th className="text-left px-6 py-3 font-medium">Nome</th>
                <th className="text-left px-6 py-3 font-medium">Slug</th>
                <th className="text-left px-6 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-[var(--border)]">
                  <td className="px-6 py-3">{r.name}</td>
                  <td className="px-6 py-3">{r.slug}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <button className="px-2 py-1 rounded-md bg-[var(--muted)] text-[var(--foreground)]" onClick={async () => {
                        const namePrompt = window.prompt('Nome:', r.name || '');
                        if (namePrompt === null) return; // cancelado
                        const slugPrompt = window.prompt('Slug:', r.slug || '');
                        if (slugPrompt === null) return; // cancelado
                        const name = namePrompt.trim();
                        const slug = slugPrompt.trim();
                        const resp = await fetch(`/api/admin/environments/${r.id}`, {
                          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name || r.name, slug: slug || r.slug })
                        });
                        if (!resp.ok) { alert('Falha ao atualizar'); return; }
                        setRows(rows.map(x => x.id === r.id ? { ...x, name: name || r.name, slug: slug || r.slug } : x));
                      }}>Editar</button>
                      <button className="px-2 py-1 rounded-md bg-[var(--destructive)] text-[var(--destructive-foreground)]" onClick={async () => {
                        if (!confirm('Excluir ambiente?')) return;
                        const resp = await fetch(`/api/admin/environments/${r.id}`, { method: 'DELETE' });
                        if (!resp.ok) { alert('Falha ao excluir'); return; }
                        setRows(rows.filter(x => x.id !== r.id));
                      }}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

