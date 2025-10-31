'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { SummaryReport, DetailedReport, ReportFilters } from '@/lib/reports/generator';
import ReportFiltersComponent from './ReportFilters';
import ReportTable from './ReportTable';

interface AvailablePeriod {
  startDate: string;
  endDate: string;
  periodKey: string;
  label: string;
  isCurrent: boolean;
}

export default function ReportsClient() {
  const t = useTranslations();
  const locale = useLocale();
  const [report, setReport] = React.useState<SummaryReport | DetailedReport | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [reportType, setReportType] = React.useState<'summary' | 'detailed'>('summary');
  const [reportScope, setReportScope] = React.useState<'timesheets' | 'pending' | 'approved' | 'rejected' | 'by-employee' | 'by-vessel'>('timesheets');
  const [currentFilters, setCurrentFilters] = React.useState<ReportFilters>({});
  const [availableYears, setAvailableYears] = React.useState<number[]>([]);
  const [availablePeriods, setAvailablePeriods] = React.useState<AvailablePeriod[]>([]);
  const [currentPeriod, setCurrentPeriod] = React.useState<AvailablePeriod | null>(null);

  // Fetch available periods on mount
  React.useEffect(() => {
    const fetchAvailablePeriods = async () => {
      try {
        const res = await fetch('/api/reports/periods');
        if (!res.ok) return;
        const data = await res.json();
        setAvailableYears(data.years || []);
        setAvailablePeriods(data.periods || []);
        setCurrentPeriod(data.currentPeriod || null);
      } catch (err) {
        console.error('Error fetching available periods:', err);
      }
    };

    fetchAvailablePeriods();
  }, []);

  const handleFilter = async (filters: ReportFilters) => {
    setLoading(true);
    setCurrentFilters(filters);
    try {
      const params = new URLSearchParams();
      params.set('type', reportType);
      params.set('scope', reportScope);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.status) params.set('status', filters.status);
      if (filters.employeeId) params.set('employeeId', filters.employeeId);

      const res = await fetch(`/api/reports/generate?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to generate report');

      const data = await res.json();

      // Replace the title with translated version
      if (data) {
        const titleKey = reportType === 'summary' ? 'summaryReportTitle' : 'detailedReportTitle';
        data.title = t(`reports.${titleKey}`) || data.title;
      }

      setReport(data);
    } catch (err) {
      console.error('Error generating report:', err);
      alert(t('reports.error') || 'Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json' | 'pdf' | 'excel') => {
    try {
      const params = new URLSearchParams();
      params.set('format', format);
      params.set('type', reportType);
      params.set('scope', reportScope);
      params.set('locale', locale); // Pass locale to API
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

      // Set appropriate file extension
      let extension: string = format;
      if (format === 'excel') extension = 'xlsx';

      a.download = `report-${reportScope}-${reportType}-${new Date().toISOString().split('T')[0]}.${extension}`;
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
    employeeName: t('reports.employeeName') || 'Search by name...',
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
    exportPDF: t('reports.exportPDF') || 'Export PDF',
    exportExcel: t('reports.exportExcel') || 'Export Excel',
    total: t('reports.total') || 'Total',
    pending: t('reports.pendingItems') || 'Pending Items',
    entries: t('reports.entries') || 'Entries',
    period: t('reports.period') || 'Period',
    details: t('reports.details') || 'Details',
    totalHours: t('reports.totalHours') || 'Total Hours',
    averageHours: t('reports.averageHours') || 'Avg Hours',
    summary: t('reports.summary') || 'Summary',
    detailed: t('reports.detailed') || 'Detailed',
    timesheets: t('reports.timesheets') || 'Timesheets',
    hours: t('reports.hours') || 'Hours',
    reportType: t('reports.reportType') || 'Report Type',
    reportScope: t('reports.reportScope') || 'Report Scope',
    allPeriods: t('reports.allPeriods') || 'All Periods',
    year: t('reports.year') || 'Year',
    allYears: t('reports.allYears') || 'All Years',
    current: t('reports.current') || 'Current',
    scopeTimesheets: t('reports.scopeTimesheets') || 'All Timesheets',
    scopePending: t('reports.scopePending') || 'Pending Items',
    scopeApproved: t('reports.scopeApproved') || 'Approved Only',
    scopeRejected: t('reports.scopeRejected') || 'Rejected Only',
    scopeByEmployee: t('reports.scopeByEmployee') || 'By Employee',
    scopeByVessel: t('reports.scopeByVessel') || 'By Vessel',
  };

  return (
    <div className="space-y-6">
      {/* Report Type and Scope Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Report Type */}
        <div>
          <h3 className="font-medium mb-3 text-[var(--foreground)]">{labels.reportType || 'Report Type'}</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="summary"
                checked={reportType === 'summary'}
                onChange={(e) => setReportType(e.target.value as 'summary' | 'detailed')}
                className="w-4 h-4"
              />
              <span className="text-sm">{labels.summary || 'Summary Report'}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="detailed"
                checked={reportType === 'detailed'}
                onChange={(e) => setReportType(e.target.value as 'summary' | 'detailed')}
                className="w-4 h-4"
              />
              <span className="text-sm">{labels.detailed || 'Detailed Report'}</span>
            </label>
          </div>
        </div>

        {/* Report Scope */}
        <div>
          <h3 className="font-medium mb-3 text-[var(--foreground)]">{labels.reportScope || 'Report Scope'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Column 1 - General & Status Scopes */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="timesheets"
                  checked={reportScope === 'timesheets'}
                  onChange={(e) => setReportScope(e.target.value as any)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{labels.scopeTimesheets || 'All Timesheets'}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="pending"
                  checked={reportScope === 'pending'}
                  onChange={(e) => setReportScope(e.target.value as any)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{labels.scopePending || 'Pending Items'}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="approved"
                  checked={reportScope === 'approved'}
                  onChange={(e) => setReportScope(e.target.value as any)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{labels.scopeApproved || 'Approved Only'}</span>
              </label>
            </div>

            {/* Column 2 - Grouping Scopes */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="rejected"
                  checked={reportScope === 'rejected'}
                  onChange={(e) => setReportScope(e.target.value as any)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{labels.scopeRejected || 'Rejected Only'}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="by-employee"
                  checked={reportScope === 'by-employee'}
                  onChange={(e) => setReportScope(e.target.value as any)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{labels.scopeByEmployee || 'By Employee'}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="by-vessel"
                  checked={reportScope === 'by-vessel'}
                  onChange={(e) => setReportScope(e.target.value as any)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{labels.scopeByVessel || 'By Vessel'}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <ReportFiltersComponent
        onFilter={handleFilter}
        labels={labels}
        availableYears={availableYears}
        availablePeriods={availablePeriods}
        currentPeriod={currentPeriod}
      />

      {/* Report Table */}
      <ReportTable report={report} loading={loading} labels={labels} onExport={handleExport} />
    </div>
  );
}