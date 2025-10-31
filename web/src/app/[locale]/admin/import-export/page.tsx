"use client";
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function ImportExportPage() {
  const t = useTranslations('admin.importExport');
  const [period, setPeriod] = useState("");
  const [format, setFormat] = useState<'json'|'csv'>('json');
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const exportUrl = `/api/export?format=${format}${period ? `&period=${encodeURIComponent(period)}` : ''}`;

  async function loadPreview() {
    setLoadingPreview(true);
    try {
      const url = `/api/export?format=json${period ? `&period=${encodeURIComponent(period)}` : ''}`;
      const resp = await fetch(url);
      const data = await resp.json();
      setPreviewData(data);
    } catch (e) {
      console.error('Failed to load preview:', e);
      setPreviewData(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function doImport(e: React.FormEvent) {
    e.preventDefault();
    setImporting(true);
    setImportResult('');
    try {
      const resp = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: importText
      });
      const j = await resp.json();
      if (!resp.ok || !j.ok) throw new Error(j?.error || t('importFailed'));
      setImportResult(`OK: timesheets=${j.counts.timesheets}, entries=${j.counts.entries}, approvals=${j.counts.approvals}`);
    } catch (e: any) {
      setImportResult(`${t('importError')}: ${e?.message || t('unknown')}`);
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => {
    loadPreview();
  }, [period]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">{t('title')}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t('subtitle')}</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium text-[var(--foreground)]">{t('export')}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm text-[var(--muted-foreground)] mb-1">{t('period')}</label>
            <input value={period} onChange={e => setPeriod(e.target.value)} className="w-full px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)]" placeholder={t('periodPlaceholder')} />
          </div>
          <div>
            <label className="block text-sm text-[var(--muted-foreground)] mb-1">{t('format')}</label>
            <select value={format} onChange={e => setFormat(e.target.value as any)} className="w-full px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)]">
              <option value="json">{t('formatJson')}</option>
              <option value="csv">{t('formatCsv')}</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={loadPreview}
              disabled={loadingPreview}
              className="px-3 py-2 rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90 disabled:opacity-50"
            >
              {loadingPreview ? t('loading') : t('preview')}
            </button>
            <a href={exportUrl} className="px-3 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90">{t('download')}</a>
          </div>
        </div>

        {/* Preview Section */}
        {previewData && (
          <div className="mt-6 space-y-4">
            <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg p-4">
              <h3 className="font-semibold text-[var(--foreground)] mb-3">{t('dataSummary')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[var(--card)] p-3 rounded-lg border border-[var(--border)]">
                  <div className="text-2xl font-bold text-[var(--primary)]">
                    {previewData.data?.timesheets?.length || 0}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)]">{t('timesheets')}</div>
                </div>
                <div className="bg-[var(--card)] p-3 rounded-lg border border-[var(--border)]">
                  <div className="text-2xl font-bold text-[var(--primary)]">
                    {previewData.data?.entries?.length || 0}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)]">{t('entries')}</div>
                </div>
                <div className="bg-[var(--card)] p-3 rounded-lg border border-[var(--border)]">
                  <div className="text-2xl font-bold text-[var(--primary)]">
                    {previewData.data?.approvals?.length || 0}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)]">{t('approvals')}</div>
                </div>
                <div className="bg-[var(--card)] p-3 rounded-lg border border-[var(--border)]">
                  <div className="text-xs text-[var(--muted-foreground)] break-all">
                    {t('tenant')}: {previewData.tenant_id?.substring(0, 8)}...
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-1">
                    {new Date(previewData.exported_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Timesheets Preview Table */}
            {previewData.data?.timesheets && previewData.data.timesheets.length > 0 && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-[var(--muted)]/40 border-b border-[var(--border)]">
                  <h4 className="font-semibold text-[var(--foreground)]">{t('timesheetsPreview')}</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[var(--muted)]/20">
                      <tr>
                        <th className="text-left px-3 py-2 text-[var(--muted-foreground)] font-medium">ID</th>
                        <th className="text-left px-3 py-2 text-[var(--muted-foreground)] font-medium">{t('employeeId')}</th>
                        <th className="text-left px-3 py-2 text-[var(--muted-foreground)] font-medium">{t('period')}</th>
                        <th className="text-left px-3 py-2 text-[var(--muted-foreground)] font-medium">{t('status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.data.timesheets.slice(0, 10).map((ts: any) => (
                        <tr key={ts.id} className="border-t border-[var(--border)] hover:bg-[var(--muted)]/10">
                          <td className="px-3 py-2 font-mono text-[var(--foreground)]">
                            {ts.id.substring(0, 8)}...
                          </td>
                          <td className="px-3 py-2 font-mono text-[var(--muted-foreground)]">
                            {ts.employee_id.substring(0, 8)}...
                          </td>
                          <td className="px-3 py-2 text-[var(--foreground)]">
                            {ts.periodo_ini} - {ts.periodo_fim}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${
                              ts.status === 'aprovado' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              ts.status === 'enviado' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              ts.status === 'recusado' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}>
                              {ts.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.data.timesheets.length > 10 && (
                  <div className="px-4 py-2 bg-[var(--muted)]/20 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
                    + {previewData.data.timesheets.length - 10} {t('additionalTimesheets')}
                  </div>
                )}
              </div>
            )}

            {/* Entries Preview Table */}
            {previewData.data?.entries && previewData.data.entries.length > 0 && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-[var(--muted)]/40 border-b border-[var(--border)]">
                  <h4 className="font-semibold text-[var(--foreground)]">{t('entriesPreview')}</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[var(--muted)]/20">
                      <tr>
                        <th className="text-left px-3 py-2 text-[var(--muted-foreground)] font-medium">Entry ID</th>
                        <th className="text-left px-3 py-2 text-[var(--muted-foreground)] font-medium">Timesheet ID</th>
                        <th className="text-left px-3 py-2 text-[var(--muted-foreground)] font-medium">{t('type')}</th>
                        <th className="text-left px-3 py-2 text-[var(--muted-foreground)] font-medium">{t('date')}</th>
                        <th className="text-left px-3 py-2 text-[var(--muted-foreground)] font-medium">{t('time')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.data.entries.slice(0, 10).map((entry: any) => (
                        <tr key={entry.id} className="border-t border-[var(--border)] hover:bg-[var(--muted)]/10">
                          <td className="px-3 py-2 font-mono text-[var(--foreground)]">
                            {entry.id.substring(0, 8)}...
                          </td>
                          <td className="px-3 py-2 font-mono text-[var(--muted-foreground)]">
                            {entry.timesheet_id.substring(0, 8)}...
                          </td>
                          <td className="px-3 py-2 text-[var(--foreground)]">
                            {entry.tipo}
                          </td>
                          <td className="px-3 py-2 text-[var(--foreground)]">
                            {entry.data}
                          </td>
                          <td className="px-3 py-2 text-[var(--muted-foreground)]">
                            {entry.hora_ini || '-'} - {entry.hora_fim || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.data.entries.length > 10 && (
                  <div className="px-4 py-2 bg-[var(--muted)]/20 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
                    + {previewData.data.entries.length - 10} {t('additionalEntries')}
                  </div>
                )}
              </div>
            )}

            {/* JSON Preview */}
            {previewData && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-[var(--muted)]/40 border-b border-[var(--border)] flex items-center justify-between">
                  <h4 className="font-semibold text-[var(--foreground)]">{t('fullJson')}</h4>
                  <button
                    onClick={() => {
                      const jsonStr = JSON.stringify(previewData, null, 2);
                      navigator.clipboard.writeText(jsonStr);
                      alert(t('jsonCopied'));
                    }}
                    className="px-3 py-1 text-xs bg-[var(--primary)] text-[var(--primary-foreground)] rounded hover:opacity-90"
                  >
                    {t('copyJson')}
                  </button>
                </div>
                <div className="p-4 overflow-x-auto">
                  <pre className="text-xs font-mono text-[var(--foreground)] bg-[var(--muted)]/20 p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(previewData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-[var(--foreground)]">{t('import')} (dry-run)</h2>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
          <p className="text-amber-800 dark:text-amber-200 text-sm">
            ⚠️ <strong>{t('validationMode')}</strong> {t('validationWarning')}
          </p>
        </div>
        <form onSubmit={doImport} className="space-y-3">
          <div className="relative">
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)] font-mono text-xs leading-relaxed"
              placeholder={`${t('pasteJson')}
{
  "data": {
    "timesheets": [],
    "entries": [],
    "approvals": []
  }
}`}
            />
            {importText && (
              <button
                type="button"
                onClick={() => setImportText('')}
                className="absolute top-2 right-2 px-2 py-1 text-xs bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--muted-foreground)] rounded"
              >
                {t('clear')}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              disabled={importing || !importText.trim()}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {importing ? t('validating') : t('validate')}
            </button>
            {importResult && (
              <div className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                importResult.startsWith('OK')
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {importResult}
              </div>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

