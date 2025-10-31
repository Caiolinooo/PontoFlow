"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import TenantSelectorModal, { TenantOption } from '@/components/admin/TenantSelectorModal';

export default function VesselsPage() {
  const t = useTranslations('admin.vessels');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/admin/vessels', { cache: 'no-store' });
        const j = await resp.json().catch(() => ({}));
        if (resp.status === 409 && j?.error === 'tenant_required') {
          setTenantOptions(j.tenants || []);
          setTenantModalOpen(true);
          return;
        }
        if (!resp.ok) throw new Error(j?.error || t('loadFailed'));
        setRows(j.vessels || []);
      } catch (e: any) {
        setError(e?.message || t('unexpectedError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">{t('title')}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)]" onClick={async () => {
            try {
              setError(null);
              const r = await fetch('/api/admin/me/tenant', { method: 'GET', cache: 'no-store' });
              const j = await r.json().catch(() => ({}));
              if (!r.ok) throw new Error(j?.error || t('loadTenantsFailed'));
              setTenantOptions(j?.tenants || []);
              setTenantModalOpen(true);
            } catch (e: any) { setError(e?.message || t('loadTenantsFailed')); }
          }}>{t('selectTenant')}</button>
          <Link href="./vessels/new" className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90">{t('new')}</Link>
        </div>
      </div>

      {loading ? (
        <div className="text-[var(--muted-foreground)]">{t('loading')}</div>
      ) : error ? (
        <div className="text-[var(--destructive)]">{error}</div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
              <tr>
                <th className="text-left px-6 py-3 font-medium">{t('name')}</th>
                <th className="text-left px-6 py-3 font-medium">{t('code')}</th>
                <th className="text-left px-6 py-3 font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border)]">
                  <td className="px-6 py-3">{r.name}</td>
                  <td className="px-6 py-3">{r.code || '-'}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <button
                        className="px-2 py-1 rounded-md bg-[var(--muted)] text-[var(--foreground)]"
                        onClick={async () => {
                          const namePrompt = window.prompt(t('namePrompt'), r.name || '');
                          if (namePrompt === null) return;
                          const codePrompt = window.prompt(t('codePrompt'), r.code || '');
                          if (codePrompt === null) return;
                          const name = namePrompt.trim();
                          const code = codePrompt.trim();
                          const resp = await fetch(`/api/admin/vessels/${r.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: name || r.name, code: code ? code : null }),
                          });
                          if (!resp.ok) { alert(t('updateFailed')); return; }
                          setRows(rows.map((x) => (x.id === r.id ? { ...x, name: name || r.name, code: code ? code : null } : x)));
                        }}
                      >
                        {t('edit')}
                      </button>
                      <button
                        className="px-2 py-1 rounded-md bg-[var(--destructive)] text-[var(--destructive-foreground)]"
                        onClick={async () => {
                          if (!confirm(t('deleteConfirm'))) return;
                          const resp = await fetch(`/api/admin/vessels/${r.id}`, { method: 'DELETE' });

                          if (!resp.ok) { alert(t('deleteFailed')); return; }
                          setRows(rows.filter((x) => x.id !== r.id));
                        }}
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-6 text-[var(--muted-foreground)] text-center">
                    {t('noVessels')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <TenantSelectorModal
        open={tenantModalOpen}
        tenants={tenantOptions}
        onClose={() => setTenantModalOpen(false)}
        onSelected={async (tenantId) => {
          await fetch('/api/admin/me/tenant', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: tenantId }) });
          window.location.reload();
        }}
      />

    </div>
  );
}

