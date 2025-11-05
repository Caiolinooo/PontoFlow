"use client";
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

export default function AuditPage() {
  const t = useTranslations('admin.audit');
  const params = useParams();
  const locale = (params.locale as string) || 'pt-BR';
  const [approvals, setApprovals] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/admin/audit', { cache: 'no-store' });
        if (!resp.ok) throw new Error(t('loadFailed'));
        const j = await resp.json();
        setApprovals(j.approvals || []);
        setEntries(j.entries || []);
      } catch (e: any) {
        setError(e?.message || t('unexpectedError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
        <p className="text-[var(--muted-foreground)]">{t('loading')}</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <p className="text-red-800 dark:text-red-200 font-medium">{t('loadError')}</p>
      <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
    </div>
  );

  const statusColors: Record<string, string> = {
    aprovado: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    recusado: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    enviado: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  };

  const tipoColors: Record<string, string> = {
    embarque: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    offshore: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    translado: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    ferias: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    folga: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">{t('title')}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t('subtitle')}</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-[var(--foreground)]">{t('approvals')}</h2>
          <span className="text-sm text-[var(--muted-foreground)]">{approvals.length} {t('records')}</span>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          {approvals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">{t('employee')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('manager')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('status')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('message')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('dateTime')}</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((a) => (
                    <tr key={a.id} className="border-t border-[var(--border)] hover:bg-[var(--muted)]/20">
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        {a.employee_name || 'N/A'}
                        <div className="text-xs font-mono text-[var(--muted-foreground)] mt-0.5">
                          TS: {a.timesheet_id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        {a.manager_name || 'N/A'}
                        <div className="text-xs font-mono text-[var(--muted-foreground)] mt-0.5">
                          {a.manager_id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[a.status] || 'bg-gray-100 text-gray-800'}`}>
                          {t(`statusLabels.${a.status}` as any) || a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)] max-w-xs truncate">
                        {a.mensagem || '-'}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)] whitespace-nowrap">
                        {new Date(a.created_at).toLocaleString(locale, {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-[var(--muted-foreground)]">
              <p>{t('noApprovalsFound')}</p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-[var(--foreground)]">{t('entries')}</h2>
          <span className="text-sm text-[var(--muted-foreground)]">{entries.length} {t('records')}</span>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          {entries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">{t('employee')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('type')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('date')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('time')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('dateTime')}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-t border-[var(--border)] hover:bg-[var(--muted)]/20">
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        {e.employee_name || 'N/A'}
                        <div className="text-xs font-mono text-[var(--muted-foreground)] mt-0.5">
                          TS: {e.timesheet_id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${tipoColors[e.tipo] || 'bg-gray-100 text-gray-800'}`}>
                          {t(`entryTypes.${e.tipo}` as any) || e.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        {new Date(e.data).toLocaleDateString(locale)}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {e.hora_ini || '-'} {e.hora_fim ? `- ${e.hora_fim}` : ''}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)] whitespace-nowrap">
                        {new Date(e.created_at).toLocaleString(locale, {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-[var(--muted-foreground)]">
              <p>{t('noEntriesFound')}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}