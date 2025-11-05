'use client';

import React from 'react';
import { ReportFilters } from '@/lib/reports/generator';

interface Period {
  startDate: string;
  endDate: string;
  periodKey: string;
  label: string;
  isCurrent: boolean;
}

interface Props {
  onFilter: (filters: ReportFilters) => void;
  labels: Record<string, string>;
  availableYears?: number[];
  availablePeriods?: Period[];
  currentPeriod?: Period | null;
  userRole?: 'ADMIN' | 'MANAGER' | 'MANAGER_TIMESHEET' | 'USER' | 'TENANT_ADMIN';
  restrictEmployeeSearch?: boolean;
}

export default function ReportFiltersComponent({
  onFilter,
  labels,
  availableYears = [],
  availablePeriods = [],
  currentPeriod = null,
  userRole = 'USER',
  restrictEmployeeSearch = false,
}: Props) {
  const [filters, setFilters] = React.useState<ReportFilters>({});
  const [loading, setLoading] = React.useState(false);
  const [employeeQuery, setEmployeeQuery] = React.useState('');
  const [employeeResults, setEmployeeResults] = React.useState<Array<{ id: string; label: string }>>([]);
  const [employeeSearching, setEmployeeSearching] = React.useState(false);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = React.useState(false);
  const [selectedYear, setSelectedYear] = React.useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>('');
  const [filteredPeriods, setFilteredPeriods] = React.useState<Period[]>(availablePeriods);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Check if user can access employee search
  const canAccessEmployeeSearch = !restrictEmployeeSearch && userRole !== 'USER';
  const isRegularUser = userRole === 'USER';

  const handleChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const searchEmployees = async (query: string) => {
    if (!query.trim() || !canAccessEmployeeSearch) {
      setEmployeeResults([]);
      return;
    }

    setEmployeeSearching(true);
    try {
      const res = await fetch(`/api/admin/search/employees?q=${encodeURIComponent(query)}&limit=10`);
      if (!res.ok) {
        console.error('Employee search failed:', res.status, res.statusText);
        setEmployeeResults([]);
        return;
      }
      
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

  // Update filtered periods when year changes
  React.useEffect(() => {
    if (!selectedYear) {
      setFilteredPeriods(availablePeriods);
    } else {
      const filtered = availablePeriods.filter(period => {
        const periodYear = new Date(period.startDate).getFullYear();
        return periodYear.toString() === selectedYear;
      });
      setFilteredPeriods(filtered);
    }
  }, [selectedYear, availablePeriods]);

  const handleYearChange = (value: string) => {
    setSelectedYear(value);
    setSelectedPeriod(''); // Reset period selection when year changes

    if (!value) {
      // Clear date filters
      const { startDate, endDate, ...rest } = filters;
      setFilters(rest);
    }
  };

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);

    if (!value) {
      // Clear date filters
      const { startDate, endDate, ...rest } = filters;
      setFilters(rest);
      return;
    }

    // Find the selected period
    const period = filteredPeriods.find(p => `${p.startDate}|${p.endDate}` === value);
    if (period) {
      setFilters(prev => ({
        ...prev,
        startDate: period.startDate,
        endDate: period.endDate
      }));
    }
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
    setSelectedYear('');
    setSelectedPeriod('');
    onFilter({});
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
      <h3 className="font-semibold mb-4 text-[var(--card-foreground)]">{labels.filters || 'Filters'}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Year Selector */}
        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
            {labels.year || 'Ano'}
          </label>
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded text-sm"
          >
            <option value="">{labels.allYears || 'Todos os anos'}</option>
            {availableYears.map((year) => (
              <option key={year} value={year.toString()}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Period Selector (Custom Periods) */}
        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
            {labels.period || 'Período'}
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded text-sm"
            disabled={!selectedYear && availableYears.length > 0}
          >
            <option value="">{labels.allPeriods || 'Todos os períodos'}</option>
            {filteredPeriods.map((period) => (
              <option
                key={`${period.startDate}|${period.endDate}`}
                value={`${period.startDate}|${period.endDate}`}
              >
                {period.label} {period.isCurrent ? `(${labels.current || 'Atual'})` : ''}
              </option>
            ))}
          </select>
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
            {isRegularUser && (
              <span className="ml-1 text-xs text-[var(--muted-foreground)]">
                ({labels.restricted || 'Restricted'})
              </span>
            )}
          </label>
          
          {canAccessEmployeeSearch ? (
            <>
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
            </>
          ) : (
            <>
              <div className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)] rounded text-sm">
                {labels.ownRecordOnly || 'Your own record only'}
              </div>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                ⚠️ {labels.employeeSearchRestricted || 'Employee search restricted to managers and admins'}
              </div>
            </>
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

