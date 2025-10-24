"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function NewTimesheetPage() {
  const t = useTranslations('employee.timesheets');
  const router = useRouter();

  // Default period = current month
  const now = new Date();
  const defaultIni = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);
  const defaultFim = useMemo(() => new Date(now.getFullYear(), now.getMonth() + 1, 0), [now]);

  const [periodoIni, setPeriodoIni] = useState<string>(toISODate(defaultIni));
  const [periodoFim, setPeriodoFim] = useState<string>(toISODate(defaultFim));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/employee/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo_ini: periodoIni, periodo_fim: periodoFim })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.error === 'employee_not_configured') {
          setError(t('errors.employeeNotConfigured'));
        } else if (data?.error === 'missing_tenant') {
          setError(t('errors.missingTenant'));
        } else if (data?.error === 'invalid_period') {
          setError(t('errors.invalidPeriod'));
        } else {
          setError(t('errors.generic'));
        }
        return;
      }
      if (data?.id) {
        router.replace(`${window.location.pathname.replace('/new', '')}/${data.id}`);
      } else {
        setError(t('errors.generic'));
      }
    } catch (e) {
      setError(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">{t('newTimesheet')}</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">{t('newTimesheetDescription')}</p>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 max-w-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">{t('fields.periodStart')}</label>
            <input
              type="date"
              value={periodoIni}
              onChange={(e) => setPeriodoIni(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">{t('fields.periodEnd')}</label>
            <input
              type="date"
              value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 text-sm text-[var(--destructive)]">{error}</div>
        )}

        <div className="mt-6 flex gap-3">
          <Button onClick={handleCreate} loading={loading}>
            {t('actions.create')}
          </Button>
          <Button variant="ghost" onClick={() => window.history.back()}>
            {t('actions.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}

