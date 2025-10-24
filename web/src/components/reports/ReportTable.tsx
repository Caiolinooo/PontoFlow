'use client';

import React from 'react';
import { SummaryReport, DetailedReport } from '@/lib/reports/generator';

interface Props {
  report: SummaryReport | DetailedReport | null;
  loading: boolean;
  labels: Record<string, string>;
  onExport: (format: 'csv' | 'json') => void;
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
        </div>
      </div>

      {/* Summary Stats */}
      {isSummary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
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
                      {item.status}
                    </span>
                  </td>
                  <td className="py-2 px-3">{item.entryCount}</td>
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
                        {item.timesheet.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">{item.entries.length}</td>
                  </tr>
                  {item.entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                      <td className="py-2 px-3"></td>
                      <td className="py-2 px-3 text-xs">{entry.data}</td>
                      <td className="py-2 px-3 text-xs">{entry.tipo}</td>
                      <td className="py-2 px-3 text-xs">{entry.hora_ini} - {entry.hora_fim}</td>
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

function getStatusColor(status: string): string {
  switch (status) {
    case 'aprovado':
      return 'bg-green-100 text-green-800';
    case 'recusado':
      return 'bg-red-100 text-red-800';
    case 'enviado':
      return 'bg-yellow-100 text-yellow-800';
    case 'bloqueado':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

