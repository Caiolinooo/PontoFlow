"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminTenantsPage() {
  const [rows, setRows] = useState<Array<{ id: string; name: string; slug: string; created_at?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/admin/tenants', { cache: 'no-store' });
        if (!resp.ok) throw new Error('Falha ao carregar tenants');
        const j = await resp.json();
        setRows(j.tenants || []);
      } catch (e: any) {
        setError(e?.message || 'Erro inesperado');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Tenants</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Gerencie organizações/tenants do sistema.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="./tenants/associations" className="inline-flex items-center px-3 py-1.5 border border-[var(--border)] bg-[var(--card)] rounded-lg hover:opacity-90">
            Associações
          </Link>
          <Link href="./tenants/new" className="inline-flex items-center px-3 py-1.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90">
            Novo Tenant
          </Link>
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
                <th className="text-left px-6 py-3 font-medium">Criado em</th>
                <th className="text-left px-6 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-t border-[var(--border)]">
                  <td className="px-6 py-3 text-[var(--foreground)]">{t.name}</td>
                  <td className="px-6 py-3 text-[var(--foreground)]">{t.slug}</td>
                  <td className="px-6 py-3 text-[var(--foreground)]">{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <button className="px-2 py-1 rounded-md bg-[var(--muted)] text-[var(--foreground)]" onClick={async () => {
                        const namePrompt = window.prompt('Nome:', t.name || '');
                        if (namePrompt === null) return;
                        const slugPrompt = window.prompt('Slug:', t.slug || '');
                        if (slugPrompt === null) return;
                        const name = namePrompt.trim();
                        const slug = slugPrompt.trim();
                        const resp = await fetch(`/api/admin/tenants/${t.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name || t.name, slug: slug || t.slug }) });
                        if (!resp.ok) { alert('Falha ao atualizar'); return; }
                        setRows(rows.map(x => x.id === t.id ? { ...x, name: name || t.name, slug: slug || t.slug } : x));
                      }}>Editar</button>
                      <button className="px-2 py-1 rounded-md bg-[var(--destructive)] text-[var(--destructive-foreground)]" onClick={async () => {
                        if (!confirm('Excluir tenant? Esta ação não pode ser desfeita.')) return;
                        const resp = await fetch(`/api/admin/tenants/${t.id}`, { method: 'DELETE' });
                        if (!resp.ok) { alert('Falha ao excluir'); return; }
                        setRows(rows.filter(x => x.id !== t.id));
                      }}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-[var(--muted-foreground)]">Nenhum tenant cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

