"use client";
import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useTranslations } from 'next-intl';

interface Environment {
  id: string;
  name: string;
  slug: string;
  color?: string;
  auto_fill_enabled?: boolean;
}

interface EditEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: Environment | null;
  onSave: (id: string, data: Partial<Environment>) => Promise<void>;
}

export default function EditEnvironmentModal({
  isOpen,
  onClose,
  environment,
  onSave,
}: EditEnvironmentModalProps) {
  const t = useTranslations('admin.environments');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    color: '#3B82F6',
    auto_fill_enabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form when environment changes
  useEffect(() => {
    if (environment) {
      setFormData({
        name: environment.name || '',
        slug: environment.slug || '',
        color: environment.color || '#3B82F6',
        auto_fill_enabled: environment.auto_fill_enabled ?? true,
      });
    }
  }, [environment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!environment) return;

    setLoading(true);
    setError(null);

    try {
      await onSave(environment.id, formData);
      onClose();
    } catch (err: any) {
      setError(err.message || t('updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  if (!environment) return null;

  return (
    <Modal open={isOpen} onClose={handleClose} title={t('editEnvironment')} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Name Field */}
        <div className="space-y-2">
          <label htmlFor="edit-name" className="block text-sm font-medium text-[var(--foreground)]">
            {t('name')} <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder={t('namePlaceholder')}
            required
            disabled={loading}
            autoFocus
          />
          <p className="text-xs text-[var(--muted-foreground)]">{t('nameHelp')}</p>
        </div>

        {/* Slug Field */}
        <div className="space-y-2">
          <label htmlFor="edit-slug" className="block text-sm font-medium text-[var(--foreground)]">
            {t('slug')} <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-slug"
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
            className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm"
            placeholder={t('slugPlaceholder')}
            required
            disabled={loading}
          />
          <p className="text-xs text-[var(--muted-foreground)]">{t('slugHelp')}</p>
        </div>

        {/* Color Field */}
        <div className="space-y-2">
          <label htmlFor="edit-color" className="block text-sm font-medium text-[var(--foreground)]">
            {t('color')}
          </label>
          <div className="flex gap-3 items-center">
            <input
              id="edit-color"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="h-10 w-20 rounded-lg border border-[var(--border)] cursor-pointer"
              disabled={loading}
            />
            <input
              type="text"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="#3B82F6"
              disabled={loading}
            />
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">{t('colorHelp')}</p>
        </div>

        {/* Auto-fill Toggle */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.auto_fill_enabled}
                onChange={(e) => setFormData({ ...formData, auto_fill_enabled: e.target.checked })}
                className="sr-only peer"
                disabled={loading}
              />
              <div className="w-11 h-6 bg-[var(--muted)] rounded-full peer-checked:bg-blue-500 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 transition-all"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-[var(--foreground)] group-hover:text-blue-500 transition-colors">
                {t('autoFillEnabled')}
              </span>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{t('autoFillHelp')}</p>
            </div>
          </label>
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
            type="submit"
            disabled={loading || !formData.name.trim() || !formData.slug.trim()}
            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t('saving')}
              </>
            ) : (
              t('save')
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

