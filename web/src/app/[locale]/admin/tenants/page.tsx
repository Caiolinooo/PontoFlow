"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function AdminTenantsPage() {
  const t = useTranslations('admin.tenants');
  const [rows, setRows] = useState<Array<{ id: string; name: string; slug: string; created_at?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/admin/tenants', { cache: 'no-store' });
        if (!resp.ok) throw new Error(t('loadFailed'));
        const j = await resp.json();
        setRows(j.tenants || []);
      } catch (e: any) {
        setError(e?.message || t('unexpectedError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">{t('title')}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="./tenants/associations" className="inline-flex items-center px-3 py-1.5 border border-[var(--border)] bg-[var(--card)] rounded-lg hover:opacity-90">
            {t('associations')}
          </Link>
          <Link href="./tenants/new" className="inline-flex items-center px-3 py-1.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90">
            {t('new')}
          </Link>
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
                <th className="text-left px-6 py-3 font-medium">{t('slug')}</th>
                <th className="text-left px-6 py-3 font-medium">{t('createdAt')}</th>
                <th className="text-left px-6 py-3 font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tenant) => (
                <tr key={tenant.id} className="border-t border-[var(--border)]">
                  <td className="px-6 py-3 text-[var(--foreground)]">{tenant.name}</td>
                  <td className="px-6 py-3 text-[var(--foreground)]">{tenant.slug}</td>
                  <td className="px-6 py-3 text-[var(--foreground)]">{tenant.created_at ? new Date(tenant.created_at).toLocaleString() : '—'}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <button className="px-2 py-1 rounded-md bg-[var(--muted)] text-[var(--foreground)]" onClick={async () => {
                        const namePrompt = window.prompt(t('namePrompt'), tenant.name || '');
                        if (namePrompt === null) return;
                        const slugPrompt = window.prompt(t('slugPrompt'), tenant.slug || '');
                        if (slugPrompt === null) return;
                        const name = namePrompt.trim();
                        const slug = slugPrompt.trim();
                        const resp = await fetch(`/api/admin/tenants/${tenant.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name || tenant.name, slug: slug || tenant.slug }) });
                        if (!resp.ok) { alert(t('updateFailed')); return; }
                        setRows(rows.map(x => x.id === tenant.id ? { ...x, name: name || tenant.name, slug: slug || tenant.slug } : x));
                      }}>{t('edit')}</button>
                      <button className="px-2 py-1 rounded-md bg-[var(--destructive)] text-[var(--destructive-foreground)]" onClick={async () => {
                        if (!confirm(t('deleteConfirm'))) return;
                        const resp = await fetch(`/api/admin/tenants/${tenant.id}`, { method: 'DELETE' });
                        if (!resp.ok) { alert(t('deleteFailed')); return; }
                        setRows(rows.filter(x => x.id !== tenant.id));
                      }}>{t('delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-[var(--muted-foreground)]">{t('noTenants')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

