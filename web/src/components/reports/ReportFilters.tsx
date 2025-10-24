'use client';

import React from 'react';
import { ReportFilters } from '@/lib/reports/generator';

interface Props {
  onFilter: (filters: ReportFilters) => void;
  labels: Record<string, string>;
}

export default function ReportFiltersComponent({ onFilter, labels }: Props) {
  const [filters, setFilters] = React.useState<ReportFilters>({});
  const [loading, setLoading] = React.useState(false);

  const handleChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      onFilter(filters);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({});
    onFilter({});
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
      <h3 className="font-semibold mb-4 text-[var(--card-foreground)]">{labels.filters || 'Filters'}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
            {labels.startDate || 'Start Date'}
          </label>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleChange('startDate', e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded text-sm"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
            {labels.endDate || 'End Date'}
          </label>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleChange('endDate', e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded text-sm"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
            {labels.status || 'Status'}
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded text-sm"
          >
            <option value="">{labels.allStatuses || 'All Statuses'}</option>
            <option value="rascunho">{labels.draft || 'Draft'}</option>
            <option value="enviado">{labels.submitted || 'Submitted'}</option>
            <option value="aprovado">{labels.approved || 'Approved'}</option>
            <option value="recusado">{labels.rejected || 'Rejected'}</option>
            <option value="bloqueado">{labels.locked || 'Locked'}</option>
          </select>
        </div>

        {/* Employee ID */}
        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
            {labels.employee || 'Employee'}
          </label>
          <input
            type="text"
            placeholder={labels.employeeId || 'Employee ID'}
            value={filters.employeeId || ''}
            onChange={(e) => handleChange('employeeId', e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded text-sm"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleApply}
          disabled={loading}
          className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? labels.loading || 'Loading...' : labels.apply || 'Apply Filters'}
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded text-sm font-medium hover:opacity-90"
        >
          {labels.reset || 'Reset'}
        </button>
      </div>
    </div>
  );
}

