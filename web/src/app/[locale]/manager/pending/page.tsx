'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import NotifyEmployeeButton from '@/components/manager/NotifyEmployeeButton';

interface Employee {
  id: string;
  display_name: string | null;
  email?: string;
}

interface Timesheet {
  id: string;
  periodo_ini: string;
  periodo_fim: string;
}

interface TimesheetItem {
  employee: Employee;
  timesheet: Timesheet | null;
  status: string;
  entries: number;
}

interface ApiResponse {
  pending_timesheets: Array<{
    id: string;
    employee_id: string;
    periodo_ini: string;
    periodo_fim: string;
    status: string;
    employee: {
      display_name?: string;
      email?: string;
      cargo?: string;
      centro_custo?: string;
    };
    entries_count: number;
  }>;
  total: number;
  metadata?: {
    query_info: {
      user_role: string;
      groups_found: string;
      employees_found: number;
      month_filter: string;
      status_filter: string;
      query_duration_ms: number;
    };
    server_timestamp: string;
  };
}

export default async function ManagerPendingPage({ params, searchParams }: {
  params: Promise<{ locale: string }>,
  searchParams: Promise<{ month?: string }>
}) {
  const { locale } = await params;
  const { month } = await searchParams;

  return <ManagerPendingPageContent locale={locale} month={month} />;
}

function ManagerPendingPageContent({ locale, month }: { locale: string, month?: string }) {
  // Translations
  const t = useTranslations('manager.pending');
  const tCounters = useTranslations('manager.pending.counters');
  const tStatusLabels = useTranslations('manager.pending.statusLabels');
  const tFilters = useTranslations('manager.pending.filters');
  const tErrors = useTranslations('errors');
  const tMessages = useTranslations('messages');
  
  // State management
  const [items, setItems] = useState<TimesheetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Use BRT timezone for month calculation to match API
  const nowBRT = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const [targetMonth, setTargetMonth] = useState(
    typeof month === 'string' && /^\d{4}-\d{2}$/.test(month) 
      ? month 
      : nowBRT.toISOString().slice(0, 7)
  );

  // Update target month when prop changes
  useEffect(() => {
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      setTargetMonth(month);
    }
  }, [month]);

  // Data validation function
  const validateTimesheetData = useCallback((item: any): boolean => {
    return (
      item &&
      typeof item === 'object' &&
      item.employee &&
      typeof item.employee_id === 'string' &&
      item.id &&
      typeof item.id === 'string'
    );
  }, []);

  // Enhanced data processing
  const processApiResponse = useCallback((apiData: ApiResponse): TimesheetItem[] => {
    if (!apiData?.pending_timesheets || !Array.isArray(apiData.pending_timesheets)) {
      console.warn('Invalid API response format:', apiData);
      return [];
    }

    const validItems = apiData.pending_timesheets
      .filter(validateTimesheetData)
      .map((ts: any): TimesheetItem => ({
        employee: {
          id: ts.employee_id,
          display_name: ts.employee?.display_name || ts.employee?.email || t('employee'),
          email: ts.employee?.email
        },
        timesheet: ts.id ? {
          id: ts.id,
          periodo_ini: ts.periodo_ini,
          periodo_fim: ts.periodo_fim
        } : null,
        status: ts.status,
        entries: ts.entries_count || 0
      }));

    if (process.env.NODE_ENV === 'development') {
      console.log(`Processed ${validItems.length} valid timesheets from ${apiData.pending_timesheets.length} total`);
      
      // Show debugging info from API metadata
      if (apiData.metadata) {
        console.log('Pending timesheets query metadata:', apiData.metadata);
      }
    }

    return validItems;
  }, [validateTimesheetData, t]);

  // Fetch pending timesheets with enhanced error handling
  const fetchPendingTimesheets = useCallback(async (month: string) => {
    try {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/manager/pending-timesheets?month=${encodeURIComponent(month)}&status=enviado`,
        { cache: 'no-store' }
      );
      
      if (response.ok) {
        const apiData: ApiResponse = await response.json();
        const processedItems = processApiResponse(apiData);
        setItems(processedItems);
        setLastUpdated(new Date());
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Successfully loaded ${processedItems.length} pending timesheets for ${month}`);
        }
      } else {
        const errorText = await response.text();
        let errorMsg = `Erro ${response.status}: ${response.statusText}`;
        
        // Enhanced error handling for specific status codes
        if (response.status === 401) {
          errorMsg = tErrors('generic');
          // You might want to redirect to login here
        } else if (response.status === 500) {
          errorMsg = tErrors('generic');
        } else if (response.status === 403) {
          errorMsg = tErrors('generic');
        }

        console.error('API Error:', response.status, errorText);
        setErrorMessage(errorMsg);
        setHasError(true);
        setItems([]);
      }
    } catch (error) {
      console.error('Network error loading pending timesheets:', error);
      setErrorMessage(tErrors('generic'));
      setHasError(true);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [processApiResponse, tErrors]);

  // Load data on mount and month change
  useEffect(() => {
    fetchPendingTimesheets(targetMonth);
  }, [targetMonth, fetchPendingTimesheets]);

  // Memoized counts for performance
  const counts = useMemo(() => {
    const newCounts = {
      total: items.length,
      pendente: items.filter(r => r.status === 'pendente').length,
      rascunho: items.filter(r => r.status === 'rascunho').length,
      enviado: items.filter(r => r.status === 'enviado').length,
      aprovado: items.filter(r => r.status === 'aprovado').length,
      recusado: items.filter(r => r.status === 'recusado').length,
    };
    return newCounts;
  }, [items]);

  // Memoized processed items with computed properties
  const memoizedItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      periodLabel: item.timesheet ? 
        `${new Date(item.timesheet.periodo_ini).toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-GB')} — ${new Date(item.timesheet.periodo_fim).toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-GB')}` : 
        'Período inválido'
    }));
  }, [items, locale]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">{t('title')}</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          {t('subtitle')}
          {lastUpdated && (
            <span className="ml-2 text-sm">
              • {tMessages('saved')} {lastUpdated.toLocaleTimeString(locale === 'pt-BR' ? 'pt-BR' : 'en-GB')}
            </span>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <form 
          method="get" 
          className="flex flex-col md:flex-row gap-3 md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const newMonth = formData.get('month') as string;
            if (newMonth && /^\d{4}-\d{2}$/.test(newMonth)) {
              setTargetMonth(newMonth);
            }
          }}
        >
          <div className="flex-1">
            <label className="block text-sm text-[var(--muted-foreground)] mb-1" htmlFor="month">
              {tFilters('month')}
            </label>
            <input 
              id="month" 
              name="month" 
              type="month" 
              defaultValue={targetMonth} 
              className="w-full bg-transparent border rounded-md px-3 py-2 border-[var(--border)] text-[var(--foreground)]"
              aria-describedby="month-help"
            />
            <p id="month-help" className="sr-only">
              {tFilters('month')}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              type="submit" 
              className="px-4 py-2 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
            >
              {tFilters('apply')}
            </button>
            <Link 
              href={`/${locale}/manager/pending`} 
              className="px-4 py-2 rounded-md border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]/50"
            >
              {tFilters('clear')}
            </Link>
          </div>
        </form>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div 
          role="status" 
          aria-live="polite" 
          aria-busy={isLoading}
          className="flex items-center justify-center p-8"
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">{t('loading') || 'Loading...'}</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && hasError && (
        <div 
          role="alert" 
          className="text-center p-8"
        >
          <div className="bg-red-50 border border-red-200 rounded-md p-6 max-w-md mx-auto">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-red-800 mb-2">{t('error') || 'Error'}</h3>
            <p className="text-red-600 mb-4">{errorMessage}</p>
            <button 
              onClick={() => fetchPendingTimesheets(targetMonth)}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              aria-label={t('retry') || 'Try again'}
            >
              {t('retry') || 'Try again'}
            </button>
          </div>
        </div>
      )}

      {/* Content - Only show when not loading and no errors */}
      {!isLoading && !hasError && (
        <>
          {/* Counters */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-[var(--card)] p-4 rounded-lg border">
              <div className="text-2xl font-bold text-[var(--foreground)]">{counts.total}</div>
              <div className="text-sm text-[var(--muted-foreground)]">{tCounters('total')}</div>
            </div>
            <div className="bg-[var(--card)] p-4 rounded-lg border">
              <div className="text-2xl font-bold text-[var(--foreground)]">{counts.pendente}</div>
              <div className="text-sm text-[var(--muted-foreground)]">{tCounters('pending')}</div>
            </div>
            <div className="bg-[var(--card)] p-4 rounded-lg border">
              <div className="text-2xl font-bold text-[var(--foreground)]">{counts.rascunho}</div>
              <div className="text-sm text-[var(--muted-foreground)]">{tCounters('draft')}</div>
            </div>
            <div className="bg-[var(--card)] p-4 rounded-lg border">
              <div className="text-2xl font-bold text-[var(--foreground)]">{counts.enviado}</div>
              <div className="text-sm text-[var(--muted-foreground)]">{tCounters('submitted')}</div>
            </div>
            <div className="bg-[var(--card)] p-4 rounded-lg border">
              <div className="text-2xl font-bold text-[var(--foreground)]">{counts.aprovado}</div>
              <div className="text-sm text-[var(--muted-foreground)]">{tCounters('approved')}</div>
            </div>
            <div className="bg-[var(--card)] p-4 rounded-lg border">
              <div className="text-2xl font-bold text-[var(--foreground)]">{counts.recusado}</div>
              <div className="text-sm text-[var(--muted-foreground)]">{tCounters('rejected')}</div>
            </div>
          </div>

          {/* Empty State */}
          {items.length === 0 && (
            <div className="text-center p-8">
              <div className="bg-green-50 border border-green-200 rounded-md p-6 max-w-md mx-auto">
                <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-green-800 mb-2">{t('noPending')}</h3>
                <p className="text-green-600">
                  {t('noPendingDescription')}
                </p>
              </div>
            </div>
          )}

          {/* Data Table */}
          {items.length > 0 && (
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border)]">
                  <thead className="bg-[var(--muted)]/50">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider"
                      >
                        {t('employee')}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider"
                      >
                        {t('status')}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider"
                      >
                        {t('period')}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider"
                      >
                        {t('actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {memoizedItems.map((row) => (
                      <tr 
                        key={`${row.employee.id}-${row.timesheet?.id || 'no-timesheet'}`} 
                        className="hover:bg-[var(--muted)]/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={null}
                              alt={row.employee.display_name ?? t('employee')}
                              initials={(row.employee.display_name ?? 'U').charAt(0).toUpperCase()}
                              size="sm"
                            />
                            <div>
                              <div className="text-[var(--foreground)] font-medium">
                                {row.employee.display_name ?? t('employee')}
                              </div>
                              {row.employee.email && (
                                <div className="text-sm text-[var(--muted-foreground)]">
                                  {row.employee.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            row.status === 'draft' || row.status === 'rascunho' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                            row.status === 'submitted' || row.status === 'enviado' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                            row.status === 'approved' || row.status === 'aprovado' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                            row.status === 'rejected' || row.status === 'recusado' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                          }`}>
                            {tStatusLabels(row.status) || row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[var(--foreground)]">
                          {row.timesheet ? (
                            <div>
                              <div>{row.periodLabel}</div>
                              <div className="text-sm text-[var(--muted-foreground)]">
                                {row.entries} {row.entries !== 1 ? (locale === 'pt-BR' ? 'entradas' : 'entries') : (locale === 'pt-BR' ? 'entrada' : 'entry')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[var(--muted-foreground)]">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {row.timesheet ? (
                            <Link
                              href={`/${locale || 'pt-BR'}/manager/timesheets/${row.timesheet.id}`}
                              className="inline-flex items-center px-3 py-1.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90 transition-opacity"
                            >
                              {t('review')}
                            </Link>
                          ) : (
                            <span className="text-[var(--muted-foreground)]">—</span>
                          )}
                          {(row.status === 'pendente' || row.status === 'rascunho') && (
                            <span className="ml-2 inline-block">
                              <NotifyEmployeeButton employeeId={row.employee.id} month={targetMonth} />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}