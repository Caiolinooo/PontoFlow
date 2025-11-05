"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import EditModal, { EditField } from '@/components/ui/EditModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function AdminTenantsPage() {
  const t = useTranslations('admin.tenants');
  const [rows, setRows] = useState<Array<{ id: string; name: string; slug: string; created_at?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<{ id: string; name: string; slug: string } | null>(null);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<{ id: string; name: string } | null>(null);

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

  const handleEdit = (tenant: { id: string; name: string; slug: string }) => {
    setEditingTenant(tenant);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (values: Record<string, string | number>) => {
    if (!editingTenant) return;

    const resp = await fetch(`/api/admin/tenants/${editingTenant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: values.name,
        slug: values.slug,
      }),
    });

    if (!resp.ok) {
      throw new Error(t('updateFailed'));
    }

    // Update local state
    setRows(rows.map(x =>
      x.id === editingTenant.id
        ? { ...x, name: values.name as string, slug: values.slug as string }
        : x
    ));
  };

  const handleDeleteClick = (tenant: { id: string; name: string }) => {
    setDeletingTenant(tenant);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTenant) return;

    const resp = await fetch(`/api/admin/tenants/${deletingTenant.id}`, {
      method: 'DELETE',
    });

    if (!resp.ok) {
      throw new Error(t('deleteFailed'));
    }

    // Update local state
    setRows(rows.filter(x => x.id !== deletingTenant.id));
    setDeleteDialogOpen(false);
    setDeletingTenant(null);
  };

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
                      <button
                        className="px-2 py-1 rounded-md bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80 transition-colors"
                        onClick={() => handleEdit(tenant)}
                      >
                        {t('edit')}
                      </button>
                      <button
                        className="px-2 py-1 rounded-md bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90 transition-opacity"
                        onClick={() => handleDeleteClick(tenant)}
                      >
                        {t('delete')}
                      </button>
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

      {/* Edit Modal */}
      {editingTenant && (
        <EditModal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingTenant(null);
          }}
          title={t('editTenant')}
          fields={[
            {
              name: 'name',
              label: t('name'),
              type: 'text',
              value: editingTenant.name,
              required: true,
              placeholder: t('namePlaceholder'),
            },
            {
              name: 'slug',
              label: t('slug'),
              type: 'text',
              value: editingTenant.slug,
              required: true,
              placeholder: t('slugPlaceholder'),
              validation: (value) => {
                const slug = value.toString().trim();
                if (!/^[a-z0-9-]+$/.test(slug)) {
                  return t('slugInvalid');
                }
                return null;
              },
            },
          ]}
          onSave={handleSaveEdit}
          saveButtonText={t('save')}
          cancelButtonText={t('cancel')}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingTenant && (
        <ConfirmDialog
          isOpen={deleteDialogOpen}
          title={t('deleteConfirmTitle')}
          message={t('deleteConfirmMessage', { name: deletingTenant.name })}
          confirmText={t('delete')}
          cancelText={t('cancel')}
          isDangerous={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeleteDialogOpen(false);
            setDeletingTenant(null);
          }}
        />
      )}
    </div>
  );
}

