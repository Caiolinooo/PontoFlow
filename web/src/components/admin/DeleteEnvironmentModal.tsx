"use client";
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useTranslations } from 'next-intl';


interface Environment {
  id: string;
  name: string;
  slug: string;
}

interface DeleteEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: Environment | null;
  onDelete: (id: string) => Promise<void>;
}

export default function DeleteEnvironmentModal({
  isOpen,
  onClose,
  environment,
  onDelete,
}: DeleteEnvironmentModalProps) {
  const t = useTranslations('admin.environments');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (!environment) return;

    setLoading(true);
    setError(null);

    try {
      await onDelete(environment.id);
      setConfirmText('');
      onClose();
    } catch (err: any) {
      setError(err.message || t('deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setConfirmText('');
      onClose();
    }
  };

  if (!environment) return null;

  const isConfirmed = confirmText.toLowerCase() === environment.name.toLowerCase();

  return (
    <Modal open={isOpen} onClose={handleClose} title={t('deleteEnvironment')} size="md">
      <div className="space-y-5">
        {/* Warning Banner */}
        <div className="flex gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13" strokeWidth="2"/><line x1="12" y1="17" x2="12" y2="17" strokeWidth="2"/></svg>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
              {t('deleteWarningTitle')}
            </h4>
            <p className="text-sm text-red-700 dark:text-red-300">
              {t('deleteWarningMessage')}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Environment Info */}
        <div className="space-y-3">
          <p className="text-sm text-[var(--foreground)]">
            {t('deleteConfirmMessage')}
          </p>
          
          <div className="p-4 rounded-lg bg-[var(--muted)] border border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-semibold bg-[var(--background)] border border-[var(--border)]">
                {environment.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[var(--foreground)]">{environment.name}</p>
                <p className="text-sm text-[var(--muted-foreground)] font-mono">{environment.slug}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Input */}
        <div className="space-y-2">
          <label htmlFor="confirm-delete" className="block text-sm font-medium text-[var(--foreground)]">
            {t('deleteConfirmLabel')} <span className="font-semibold text-red-600">"{environment.name}"</span>
          </label>
          <input
            id="confirm-delete"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            placeholder={environment.name}
            disabled={loading}
            autoFocus
          />
          <p className="text-xs text-[var(--muted-foreground)]">
            {t('deleteConfirmHelp')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] font-medium hover:bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || !isConfirmed}
            className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t('deleting')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13" strokeWidth="2"/><line x1="12" y1="17" x2="12" y2="17" strokeWidth="2"/></svg>
                {t('delete')}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

