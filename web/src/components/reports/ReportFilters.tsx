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
  const [employeeQuery, setEmployeeQuery] = React.useState('');
  const [employeeResults, setEmployeeResults] = React.useState<Array<{ id: string; label: string }>>([]);
  const [employeeSearching, setEmployeeSearching] = React.useState(false);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = React.useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const searchEmployees = async (query: string) => {
    if (!query.trim()) {
      setEmployeeResults([]);
      return;
    }

    setEmployeeSearching(true);
    try {
      const res = await fetch(`/api/admin/search/employees?q=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      setEmployeeResults(data.items || []);
      setShowEmployeeDropdown(true);
    } catch (error) {
      console.error('Error searching employees:', error);
      setEmployeeResults([]);
    } finally {
      setEmployeeSearching(false);
    }
  };

  const handleEmployeeQueryChange = (value: string) => {
    setEmployeeQuery(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchEmployees(value);
    }, 300);
  };

  const selectEmployee = (employee: { id: string; label: string }) => {
    setEmployeeQuery(employee.label);
    setFilters(prev => ({ ...prev, employeeId: employee.id }));
    setShowEmployeeDropdown(false);
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
    setEmployeeQuery('');
    setEmployeeResults([]);
    setShowEmployeeDropdown(false);
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

        {/* Employee Search */}
        <div className="relative">
          <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
            {labels.employee || 'Employee'}
          </label>
          <input
            type="text"
            placeholder={labels.employeeName || 'Search by name...'}
            value={employeeQuery}
            onChange={(e) => handleEmployeeQueryChange(e.target.value)}
            onFocus={() => employeeResults.length > 0 && setShowEmployeeDropdown(true)}
            className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded text-sm"
          />
          {employeeSearching && (
            <div className="absolute right-3 top-9 text-[var(--muted-foreground)]">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
          {showEmployeeDropdown && employeeResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl max-h-60 overflow-auto">
              {employeeResults.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => selectEmployee(emp)}
                  className="w-full text-left px-4 py-2 hover:bg-[var(--muted)] text-sm transition-colors"
                >
                  {emp.label}
                </button>
              ))}
            </div>
          )}
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

