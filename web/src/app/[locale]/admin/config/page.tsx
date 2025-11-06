"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function AdminConfigPage() {
  const t = useTranslations('admin.config');
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentBaseUrl();
  }, []);

  async function loadCurrentBaseUrl() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/config');
      
      if (response.ok) {
        const data = await response.json();
        setBaseUrl(data.baseUrl || 'http://localhost:3000');
      } else {
        // If API doesn't exist yet or fails, use default
        setBaseUrl('http://localhost:3000');
      }
    } catch (err) {
      console.error('Error loading base URL:', err);
      setBaseUrl('http://localhost:3000');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ baseUrl }),
      });

      if (response.ok) {
        setSuccess(t('successMessage'));
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || t('errorMessage'));
      }
    } catch (err) {
      console.error('Error saving base URL:', err);
      setError(t('errorMessage'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">{t('title')}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {t('subtitle')}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="baseUrl" className="block text-sm font-medium text-[var(--foreground)] mb-2">
              {t('baseUrlLabel')}
            </label>
            <input
              type="url"
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:3000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-[var(--foreground)]"
              required
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {t('baseUrlHelp')}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {saving ? t('saving') : t('saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}