"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import TenantSelectorModal, { TenantOption } from '@/components/admin/TenantSelectorModal';
import EditEnvironmentModal from '@/components/admin/EditEnvironmentModal';
import DeleteEnvironmentModal from '@/components/admin/DeleteEnvironmentModal';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2 } from 'lucide-react';

interface Environment {
  id: string;
  name: string;
  slug: string;
  color?: string;
  auto_fill_enabled?: boolean;
}

export default function EnvironmentsPage() {
  const t = useTranslations('admin.environments');
  const [rows, setRows] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment | null>(null);

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
        if (!resp.ok) throw new Error(j?.error || t('loadFailed'));
        setRows(j.environments || []);
      } catch (e: any) {
        setError(e?.message || t('unexpectedError'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
          <Link href="./environments/new" className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90">{t('new')}</Link>
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
                <th className="text-left px-6 py-3 font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-[var(--border)] hover:bg-[var(--muted)]/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full border border-[var(--border)]"
                        style={{ backgroundColor: r.color || '#3B82F6' }}
                      />
                      <span className="font-medium">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 rounded bg-[var(--muted)] text-xs font-mono">{r.slug}</code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedEnvironment(r);
                          setEditModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 transition-colors text-sm font-medium"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEnvironment(r);
                          setDeleteModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 transition-colors text-sm font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t('delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      <EditEnvironmentModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedEnvironment(null);
        }}
        environment={selectedEnvironment}
        onSave={async (id, data) => {
          const resp = await fetch(`/api/admin/environments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (!resp.ok) {
            const j = await resp.json().catch(() => ({}));
            throw new Error(j?.error || t('updateFailed'));
          }
          // Update local state
          setRows(rows.map(x => x.id === id ? { ...x, ...data } : x));
        }}
      />

      {/* Delete Modal */}
      <DeleteEnvironmentModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedEnvironment(null);
        }}
        environment={selectedEnvironment}
        onDelete={async (id) => {
          const resp = await fetch(`/api/admin/environments/${id}`, { method: 'DELETE' });
          if (!resp.ok) {
            const j = await resp.json().catch(() => ({}));
            throw new Error(j?.error || t('deleteFailed'));
          }
          // Update local state
          setRows(rows.filter(x => x.id !== id));
        }}
      />

      {/* Tenant Selector Modal */}
      <TenantSelectorModal
        open={tenantModalOpen}
        onClose={() => setTenantModalOpen(false)}
        tenants={tenantOptions}
        onSelected={async (tenantId) => {
          const resp = await fetch('/api/admin/me/tenant', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenant_id: tenantId }),
          });
          if (!resp.ok) {
            setError(t('setTenantFailed'));
            return;
          }
          setTenantModalOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
}

