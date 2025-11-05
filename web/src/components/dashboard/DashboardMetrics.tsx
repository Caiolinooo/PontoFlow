'use client';

import { useEffect, useState } from 'react';

interface DashboardMetrics {
  hoursThisMonth: number;
  overtime50?: number;
  overtime100?: number;
  approved?: number;
  pending?: number;
  pendingEmployees?: string[]; // List of employee names with pending timesheets
}

interface DashboardMetricsProps {
  userRole: 'ADMIN' | 'MANAGER' | 'MANAGER_TIMESHEET' | 'USER' | 'TENANT_ADMIN';
}

export default function DashboardMetrics({ userRole }: DashboardMetricsProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/dashboard/metrics', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.status}`);
        }

        const data = await response.json();
        setMetrics(data.metrics);
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const formatNumber = (num: number | undefined) => {
    if (loading) return '...';
    if (error) return '--';
    if (num === undefined || num === null) return '0';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  const formatHours = (num: number | undefined) => {
    if (loading) return '...';
    if (error) return '--';
    if (num === undefined || num === null) return '0h';
    return `${num.toFixed(1)}h`;
  };

  if (error) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-[var(--card)] to-[var(--card)]/50 rounded-xl p-4 border border-red-500/20 backdrop-blur">
          <div className="text-center text-red-500 text-sm">
            Erro ao carregar métricas
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-5xl mx-auto">
      {/* Hours This Month - Always shown */}
      <div className="bg-gradient-to-br from-[var(--card)] to-[var(--card)]/50 rounded-xl p-4 border border-[var(--border)] backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Horas neste mês</p>
            <p className="text-xl font-bold text-[var(--foreground)]">{formatHours(metrics?.hoursThisMonth)}</p>
          </div>
        </div>
      </div>

      {(userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'MANAGER_TIMESHEET' || userRole === 'TENANT_ADMIN') ? (
        <>
          {/* Approved - Manager/Admin only */}
          <div className="bg-gradient-to-br from-[var(--card)] to-[var(--card)]/50 rounded-xl p-4 border border-[var(--border)] backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Aprovadas</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{formatNumber(metrics?.approved)}</p>
              </div>
            </div>
          </div>

          {/* Pending - Manager/Admin only */}
          <div
            className="bg-gradient-to-br from-[var(--card)] to-[var(--card)]/50 rounded-xl p-4 border border-[var(--border)] backdrop-blur relative group cursor-help"
            title={metrics?.pendingEmployees && metrics.pendingEmployees.length > 0
              ? `Colaboradores pendentes:\n${metrics.pendingEmployees.join('\n')}`
              : 'Nenhum colaborador pendente'}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Pendentes</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{formatNumber(metrics?.pending)}</p>
              </div>
            </div>

            {/* Tooltip with pending employee names */}
            {metrics?.pendingEmployees && metrics.pendingEmployees.length > 0 && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-max max-w-xs">
                <div className="bg-[var(--popover)] border border-[var(--border)] rounded-lg shadow-lg p-3">
                  <p className="text-xs font-semibold text-[var(--foreground)] mb-2">Colaboradores pendentes:</p>
                  <ul className="text-xs text-[var(--muted-foreground)] space-y-1">
                    {metrics.pendingEmployees.map((name, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        {name}
                      </li>
                    ))}
                  </ul>
                  {/* Arrow pointing down */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                    <div className="border-8 border-transparent border-t-[var(--popover)]"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Overtime 50% - Employee only */}
          <div className="bg-gradient-to-br from-[var(--card)] to-[var(--card)]/50 rounded-xl p-4 border border-[var(--border)] backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Horas extras 50%</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{formatHours(metrics?.overtime50)}</p>
              </div>
            </div>
          </div>

          {/* Overtime 100% - Employee only */}
          <div className="bg-gradient-to-br from-[var(--card)] to-[var(--card)]/50 rounded-xl p-4 border border-[var(--border)] backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Horas extras 100%</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{formatHours(metrics?.overtime100)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}