'use client';

import React from 'react';
import { SummaryReport, DetailedReport } from '@/lib/reports/generator';

interface Props {
  report: SummaryReport | DetailedReport | null;
  loading: boolean;
  labels: Record<string, string>;
  onExport: (format: 'csv' | 'json' | 'pdf' | 'excel') => void;
}

export default function ReportTable({ report, loading, labels, onExport }: Props) {
  if (loading) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
        <p className="text-[var(--muted-foreground)]">{labels.loading || 'Loading...'}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
        <p className="text-[var(--muted-foreground)]">{labels.noData || 'No data to display'}</p>
      </div>
    );
  }

  const isSummary = 'summary' in report;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{report.title}</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {labels.generatedAt || 'Generated at'}: {new Date(report.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onExport('csv')}
            className="px-3 py-2 bg-emerald-600 text-white rounded text-sm font-medium hover:opacity-90"
          >
            {labels.exportCSV || 'Export CSV'}
          </button>
          <button
            onClick={() => onExport('json')}
            className="px-3 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded text-sm font-medium hover:opacity-90"
          >
            {labels.exportJSON || 'Export JSON'}
          </button>
          <button
            onClick={() => onExport('pdf')}
            className="px-3 py-2 bg-red-600 text-white rounded text-sm font-medium hover:opacity-90"
          >
            {labels.exportPDF || 'Export PDF'}
          </button>
          <button
            onClick={() => onExport('excel')}
            className="px-3 py-2 bg-green-600 text-white rounded text-sm font-medium hover:opacity-90"
          >
            {labels.exportExcel || 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {isSummary && (
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          <div className="border border-[var(--border)] rounded p-3 bg-[var(--muted)]">
            <p className="text-xs text-[var(--muted-foreground)]">{labels.total || 'Total'}</p>
            <p className="text-lg font-semibold">{(report as SummaryReport).summary.totalTimesheets}</p>
          </div>
          <div className="border border-[var(--border)] rounded p-3 bg-[var(--muted)]">
            <p className="text-xs text-[var(--muted-foreground)]">{labels.approved || 'Approved'}</p>
            <p className="text-lg font-semibold">{(report as SummaryReport).summary.approved}</p>
          </div>
          <div className="border border-[var(--border)] rounded p-3 bg-[var(--muted)]">
            <p className="text-xs text-[var(--muted-foreground)]">{labels.rejected || 'Rejected'}</p>
            <p className="text-lg font-semibold">{(report as SummaryReport).summary.rejected}</p>
          </div>
          <div className="border border-[var(--border)] rounded p-3 bg-[var(--muted)]">
            <p className="text-xs text-[var(--muted-foreground)]">{labels.pending || 'Pending'}</p>
            <p className="text-lg font-semibold">{(report as SummaryReport).summary.pending}</p>
          </div>
          <div className="border border-[var(--border)] rounded p-3 bg-[var(--muted)]">
            <p className="text-xs text-[var(--muted-foreground)]">{labels.draft || 'Draft'}</p>
            <p className="text-lg font-semibold">{(report as SummaryReport).summary.draft}</p>
          </div>
          <div className="border border-[var(--border)] rounded p-3 bg-[var(--muted)]">
            <p className="text-xs text-[var(--muted-foreground)]">{labels.totalHours || 'Total Hours'}</p>
            <p className="text-lg font-semibold">{(report as SummaryReport).summary.totalHours?.toFixed(1) || '0.0'}</p>
          </div>
          <div className="border border-[var(--border)] rounded p-3 bg-[var(--muted)]">
            <p className="text-xs text-[var(--muted-foreground)]">{labels.averageHours || 'Avg Hours'}</p>
            <p className="text-lg font-semibold">{(report as SummaryReport).summary.averageHours?.toFixed(1) || '0.0'}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="py-2 px-3">{labels.employee || 'Employee'}</th>
              <th className="py-2 px-3">{labels.period || 'Period'}</th>
              <th className="py-2 px-3">{labels.status || 'Status'}</th>
              <th className="py-2 px-3">{labels.entries || 'Entries'}</th>
              {isSummary && (
                <>
                  <th className="py-2 px-3 text-right">{labels.normalHours || 'Normal Hours'}</th>
                  <th className="py-2 px-3 text-right">{labels.extraHours || 'Extra Hours'}</th>
                  <th className="py-2 px-3 text-right">{labels.totalHours || 'Total Hours'}</th>
                </>
              )}
              {!isSummary && <th className="py-2 px-3">{labels.details || 'Details'}</th>}
            </tr>
          </thead>
          <tbody>
            {isSummary ? (
              (report as SummaryReport).items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50">
                  <td className="py-2 px-3">{item.employeeName}</td>
                  <td className="py-2 px-3">{item.period}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                      {translateStatus(item.status, labels)}
                    </span>
                  </td>
                  <td className="py-2 px-3">{item.entryCount}</td>
                  <td className="py-2 px-3 text-right font-medium">
                    {(item.normalHours || 0).toFixed(1)}h
                  </td>
                  <td className="py-2 px-3 text-right font-medium">
                    {(item.extraHours || 0).toFixed(1)}h
                  </td>
                  <td className="py-2 px-3 text-right font-medium">
                    {(item.totalHours || 0).toFixed(1)}h
                  </td>
                </tr>
              ))
            ) : (
              (report as DetailedReport).items.map((item) => (
                <React.Fragment key={item.timesheet.id}>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                    <td className="py-2 px-3 font-medium">{item.timesheet.employeeName}</td>
                    <td className="py-2 px-3">{item.timesheet.period}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.timesheet.status)}`}>
                        {translateStatus(item.timesheet.status, labels)}
                      </span>
                    </td>
                    <td className="py-2 px-3">{item.entries.length}</td>
                    <td className="py-2 px-3"></td>
                  </tr>
                  {item.entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                      <td className="py-2 px-3 pl-8 text-xs">{entry.data}</td>
                      <td className="py-2 px-3 text-xs">{entry.tipo}</td>
                      <td className="py-2 px-3 text-xs">{entry.hora_ini} - {entry.hora_fim}</td>
                      <td className="py-2 px-3 text-xs"></td>
                      <td className="py-2 px-3 text-xs font-medium">
                        {entry.duration ? `${entry.duration.toFixed(1)}h` : '-'}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function translateStatus(status: string, labels: Record<string, string>): string {
  const statusLower = status.toLowerCase();

  // Map status to label keys
  const statusMap: Record<string, string> = {
    rascunho: labels.draft || 'Rascunho',
    draft: labels.draft || 'Draft',
    enviado: labels.submitted || 'Enviado',
    submitted: labels.submitted || 'Submitted',
    aprovado: labels.approved || 'Aprovado',
    approved: labels.approved || 'Approved',
    recusado: labels.rejected || 'Recusado',
    rejected: labels.rejected || 'Rejected',
    bloqueado: labels.locked || 'Bloqueado',
    locked: labels.locked || 'Locked',
  };

  return statusMap[statusLower] || status;
}

function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();

  // Approved (Portuguese and English)
  if (statusLower === 'aprovado' || statusLower === 'approved') {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  }

  // Rejected (Portuguese and English)
  if (statusLower === 'recusado' || statusLower === 'rejected') {
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }

  // Submitted/Pending (Portuguese and English)
  if (statusLower === 'enviado' || statusLower === 'submitted') {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  }

  // Locked (Portuguese and English)
  if (statusLower === 'bloqueado' || statusLower === 'locked') {
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }

  // Draft (Portuguese and English)
  if (statusLower === 'rascunho' || statusLower === 'draft') {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  }

  // Default
  return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
}