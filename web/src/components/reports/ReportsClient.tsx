'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { SummaryReport, DetailedReport, ReportFilters } from '@/lib/reports/generator';
import ReportFiltersComponent from './ReportFilters';
import ReportTable from './ReportTable';

export default function ReportsClient() {
  const t = useTranslations();
  const [report, setReport] = React.useState<SummaryReport | DetailedReport | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [reportType, setReportType] = React.useState<'summary' | 'detailed'>('summary');
  const [currentFilters, setCurrentFilters] = React.useState<ReportFilters>({});

  const handleFilter = async (filters: ReportFilters) => {
    setLoading(true);
    setCurrentFilters(filters);
    try {
      const params = new URLSearchParams();
      params.set('type', reportType);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.status) params.set('status', filters.status);
      if (filters.employeeId) params.set('employeeId', filters.employeeId);

      const res = await fetch(`/api/reports/generate?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to generate report');

      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error('Error generating report:', err);
      alert(t('reports.error') || 'Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams();
      params.set('format', format);
      if (currentFilters.startDate) params.set('startDate', currentFilters.startDate);
      if (currentFilters.endDate) params.set('endDate', currentFilters.endDate);
      if (currentFilters.status) params.set('status', currentFilters.status);
      if (currentFilters.employeeId) params.set('employeeId', currentFilters.employeeId);

      const res = await fetch(`/api/reports/export?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to export report');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting report:', err);
      alert(t('reports.exportError') || 'Error exporting report');
    }
  };

  const labels = {
    filters: t('reports.filters') || 'Filters',
    startDate: t('reports.startDate') || 'Start Date',
    endDate: t('reports.endDate') || 'End Date',
    status: t('reports.status') || 'Status',
    employee: t('reports.employee') || 'Employee',
    employeeId: t('reports.employeeId') || 'Employee ID',
    allStatuses: t('reports.allStatuses') || 'All Statuses',
    draft: t('reports.draft') || 'Draft',
    submitted: t('reports.submitted') || 'Submitted',
    approved: t('reports.approved') || 'Approved',
    rejected: t('reports.rejected') || 'Rejected',
    locked: t('reports.locked') || 'Locked',
    apply: t('reports.apply') || 'Apply Filters',
    reset: t('reports.reset') || 'Reset',
    loading: t('reports.loading') || 'Loading...',
    noData: t('reports.noData') || 'No data to display',
    generatedAt: t('reports.generatedAt') || 'Generated at',
    exportCSV: t('reports.exportCSV') || 'Export CSV',
    exportJSON: t('reports.exportJSON') || 'Export JSON',
    total: t('reports.total') || 'Total',
    pending: t('reports.pending') || 'Pending',
    entries: t('reports.entries') || 'Entries',
    period: t('reports.period') || 'Period',
    details: t('reports.details') || 'Details',
  };

  return (
    <div className="space-y-6">
      {/* Report Type Selector */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            value="summary"
            checked={reportType === 'summary'}
            onChange={(e) => setReportType(e.target.value as 'summary' | 'detailed')}
            className="w-4 h-4"
          />
          <span>{t('reports.summary') || 'Summary Report'}</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            value="detailed"
            checked={reportType === 'detailed'}
            onChange={(e) => setReportType(e.target.value as 'summary' | 'detailed')}
            className="w-4 h-4"
          />
          <span>{t('reports.detailed') || 'Detailed Report'}</span>
        </label>
      </div>

      {/* Filters */}
      <ReportFiltersComponent onFilter={handleFilter} labels={labels} />

      {/* Report Table */}
      <ReportTable report={report} loading={loading} labels={labels} onExport={handleExport} />
    </div>
  );
}

