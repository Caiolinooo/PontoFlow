"use client";

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import TenantSelectorModal, { TenantOption } from '@/components/admin/TenantSelectorModal';
import { useTranslations } from 'next-intl';
import { MetaPageHeader } from '@/components/ui/meta/PageHeader';
import { isMetaUI } from '@/lib/flags';
import { useParams } from 'next/navigation';

export default function AdminDelegationsPage() {
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('admin.delegations');
  const [rows, setRows] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/delegations/groups', { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      console.log('[Delegations Page] API response:', { status: r.status, data: j });
      if (r.status === 409 && j?.error === 'tenant_required') {
        setTenantOptions(j.tenants || []);
        setTenantModalOpen(true);
        return;
      }
      if (!r.ok) throw new Error(j?.error || t('loadFailed'));
      console.log('[Delegations Page] Setting rows:', j.items);
      setRows((j.items || []).map((g: any) => ({ id: g.id, name: g.name })));
    } catch (e: any) {
      console.error('[Delegations Page] Error:', e);
      setError(e?.message || t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      {isMetaUI() ? (
        <MetaPageHeader
          title={t('title')}
          subtitle={t('subtitle')}
          breadcrumbs={[
            { href: `/${locale}/dashboard`, label: 'Dashboard' },
            { label: 'Admin' },
            { label: t('title') },
          ]}
          actions={(
            <>
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
              <Link
                href={`/${locale}/admin/delegations/groups/new`}
                className="inline-flex items-center px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90 transition-colors"
              >
                + {t('newGroup')}
              </Link>
            </>
          )}
        />
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">{t('title')}</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{t('subtitle')}</p>
          </div>
          <div className="flex gap-2">
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
            <Link
              href={`/${locale}/admin/delegations/groups/new`}
              className="inline-flex items-center px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90 transition-colors"
            >
              + {t('newGroup')}
            </Link>
          </div>
        </div>
      )
      }

      {loading ? (
        <div className="text-[var(--muted-foreground)]">{t('loading')}</div>
      ) : error ? (
        <div className="text-[var(--destructive)]">{error}</div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--muted)]/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{t('name')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-10 text-center text-[var(--muted-foreground)]">
                    <div className="max-w-md mx-auto">
                      <p className="font-medium">{t('noGroups')}</p>
                      <p className="text-sm mt-1">{t('noGroupsDescription')}</p>
                    </div>
                  </td>
                </tr>
              )}
              {rows.map(g => (
                <tr key={g.id} className="hover:bg-[var(--muted)]/50 transition-colors">
                  <td className="px-6 py-4">{g.name}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/${locale}/admin/delegations/groups/${g.id}`} className="text-[var(--primary)] hover:opacity-90">
                      {t('editGroup')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TenantSelectorModal
        open={tenantModalOpen}
        tenants={tenantOptions}
        onClose={() => setTenantModalOpen(false)}
        onSelected={async (tenantId) => {
          const resp = await fetch('/api/admin/me/tenant', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: tenantId }) });
          if (!resp.ok) { setError(t('setTenantFailed')); return; }
          await load();
        }}
      />
    </div>
  );
}

