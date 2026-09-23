"use client";

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

type Delivery = {
  id: string;
  timesheet_id: string;
  employee_id: string;
  centro_custo: string;
  periodo_ini: string;
  periodo_fim: string;
  status: 'pendente' | 'entregue';
  last_error: string | null;
  updated_at: string;
  employee: { display_name: string | null } | null;
};

const MONTH_RE = /^\d{4}-\d{2}$/;

export default function DpDeliveriesPage() {
  const t = useTranslations('admin.dp');
  const tErr = useTranslations('errors');
  const [rows, setRows] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [cc, setCc] = useState('');
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (MONTH_RE.test(month)) params.set('month', month);
      if (cc.trim()) params.set('centro_custo', cc.trim());
      if (status) params.set('status', status);
      const resp = await fetch(`/api/admin/dp/deliveries?${params.toString()}`, { cache: 'no-store' });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(j?.error || 'fetch_failed');
      setRows(j.deliveries ?? []);
    } catch {
      setError(tErr('generic'));
    } finally {
      setLoading(false);
    }
  }, [month, cc, status, tErr]);

  useEffect(() => { load(); }, [load]);

  const retry = async (d: Delivery) => {
    setBusyId(d.id);
    setError(null);
    try {
      const resp = await fetch('/api/admin/dp/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timesheetId: d.timesheet_id }),
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok || !j.ok) setError(j?.error || tErr('generic'));
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">{t('title')}</h1>
      <p className="text-sm text-[var(--muted-foreground)] mt-1 mb-6">{t('subtitle')}</p>

      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="block text-xs text-[var(--muted-foreground)] mb-1">{t('filters.month')}</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)] text-sm" />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted-foreground)] mb-1">{t('filters.costCenter')}</label>
          <input value={cc} onChange={e => setCc(e.target.value)} placeholder="CC-001" className="px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)] text-sm" />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted-foreground)] mb-1">{t('filters.status')}</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)] text-sm">
            <option value="">{t('filters.all')}</option>
            <option value="entregue">{t('status.entregue')}</option>
            <option value="pendente">{t('status.pendente')}</option>
          </select>
        </div>
      </div>

      {error && <div className="text-[var(--destructive)] text-sm mb-3">{error}</div>}

      <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
              <th className="px-4 py-3 font-medium">{t('table.employee')}</th>
              <th className="px-4 py-3 font-medium">{t('table.costCenter')}</th>
              <th className="px-4 py-3 font-medium">{t('table.period')}</th>
              <th className="px-4 py-3 font-medium">{t('table.status')}</th>
              <th className="px-4 py-3 font-medium">{t('table.updatedAt')}</th>
              <th className="px-4 py-3 font-medium">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(d => (
              <tr key={d.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3">{d.employee?.display_name || d.employee_id}</td>
                <td className="px-4 py-3">{d.centro_custo}</td>
                <td className="px-4 py-3">{d.periodo_ini} → {d.periodo_fim}</td>
                <td className="px-4 py-3" title={d.last_error ?? undefined}>
                  <span className={`px-2 py-0.5 rounded text-xs ${d.status === 'entregue' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'}`}>
                    {d.status === 'entregue' ? t('status.entregue') : t('status.pendente')}
                  </span>
                  {d.last_error && <span className="block text-xs text-[var(--destructive)] mt-1">{d.last_error}</span>}
                </td>
                <td className="px-4 py-3 text-[var(--muted-foreground)]">{new Date(d.updated_at).toLocaleString('pt-BR')}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <a href={`/api/admin/dp/deliveries/${d.id}/file`} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-medium hover:bg-[var(--primary)]/20 transition-colors">
                      {t('actions.download')}
                    </a>
                    <button disabled={busyId === d.id} onClick={() => retry(d)} className="px-3 py-1.5 rounded-lg bg-[var(--muted)] text-[var(--foreground)] text-xs font-medium hover:bg-[var(--muted)]/80 transition-colors disabled:opacity-50">
                      {t('actions.retry')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <div className="px-4 py-8 text-center text-[var(--muted-foreground)]">{t('empty')}</div>
        )}
        {loading && (
          <div className="px-4 py-8 text-center text-[var(--muted-foreground)]">{t('loading')}</div>
        )}
      </div>
    </div>
  );
}
