"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface PendingMonth {
  month: string;
  status: 'pendente' | 'rascunho' | 'enviado' | 'aprovado' | 'recusado';
  hasTimesheet: boolean;
  deadline: string;
  isOverdue: boolean;
}

interface CurrentMonthStatus {
  hasTimesheet: boolean;
  status: 'pendente' | 'rascunho' | 'enviado' | 'aprovado' | 'recusado';
  entriesCount: number;
  completionPercentage: number;
  deadline: string;
  deadlineInfo: {
    daysLeft: number;
    isOverdue: boolean;
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  message: string;
}

interface PendingStatusResponse {
  currentMonth: CurrentMonthStatus;
  pendingMonths: PendingMonth[];
  summary: {
    totalPending: number;
    overdueCount: number;
    urgentActionRequired: boolean;
    overallUrgency: 'low' | 'medium' | 'high' | 'critical';
    nextDeadline: string;
    daysUntilNextDeadline: number;
  };
}

export default function EmployeePendingStatus() {
  const t = useTranslations('dashboard');
  const [data, setData] = useState<PendingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPendingStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/employee/pending-status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch pending status: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching pending status:', err);
        setError(err instanceof Error ? err.message : 'Failed to load status');
      } finally {
        setLoading(false);
      }
    };

    fetchPendingStatus();
  }, []);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'from-red-500 to-red-600';
      case 'high': return 'from-orange-500 to-red-500';
      case 'medium': return 'from-yellow-500 to-orange-500';
      default: return 'from-green-500 to-yellow-500';
    }
  };

  const getUrgencyBorder = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'border-red-500';
      case 'high': return 'border-orange-500';
      case 'medium': return 'border-yellow-500';
      default: return 'border-green-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'rascunho':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case 'enviado':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      case 'aprovado':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'recusado':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'rascunho': return 'Rascunho';
      case 'enviado': return 'Enviado';
      case 'aprovado': return 'Aprovado';
      case 'recusado': return 'Recusado';
      case 'pendente': return 'Pendente';
      default: return status;
    }
  };

  const formatDeadlineMessage = (deadlineInfo: any) => {
    if (deadlineInfo.isOverdue) {
      return `Vencido há ${Math.abs(deadlineInfo.daysLeft)} dias`;
    } else if (deadlineInfo.daysLeft === 0) {
      return 'Vence hoje!';
    } else if (deadlineInfo.daysLeft === 1) {
      return 'Vence amanhã';
    } else {
      return `${deadlineInfo.daysLeft} dias restantes`;
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center animate-pulse">
            <div className="w-4 h-4 bg-blue-500 rounded animate-pulse"></div>
          </div>
          <div className="h-6 bg-[var(--muted)] rounded animate-pulse w-48"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-[var(--muted)] rounded animate-pulse"></div>
          <div className="h-4 bg-[var(--muted)] rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-[var(--muted)] rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-red-800 dark:text-red-200 font-medium">Erro ao carregar status</h3>
            <p className="text-red-600 dark:text-red-400 text-sm">{error || 'Status não disponível'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { currentMonth, pendingMonths, summary } = data;

  return (
    <div className="space-y-4">
      {/* Current Month Status - Priority Display */}
      <div className={`bg-gradient-to-br from-[var(--card)] to-[var(--card)]/80 rounded-xl border-2 p-6 ${getUrgencyBorder(summary.overallUrgency)} shadow-lg`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getUrgencyColor(summary.overallUrgency)}/10 flex items-center justify-center`}>
              <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${getUrgencyColor(summary.overallUrgency)} flex items-center justify-center`}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                {currentMonth.hasTimesheet ? 'Timesheet Atual' : 'Timesheet Pendente'}
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          
          {/* Urgency Badge */}
          {summary.urgentActionRequired && (
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
              URGENTE!
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className="mb-4">
          <p className="text-[var(--foreground)] font-medium mb-2">{currentMonth.message}</p>
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`font-medium ${currentMonth.deadlineInfo.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {formatDeadlineMessage(currentMonth.deadlineInfo)}
            </span>
          </div>
        </div>

        {/* Progress Bar (if has timesheet) */}
        {currentMonth.hasTimesheet && currentMonth.status !== 'aprovado' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--muted-foreground)]">Progresso</span>
              <span className="text-sm font-bold text-[var(--foreground)]">{currentMonth.completionPercentage}%</span>
            </div>
            <div className="w-full bg-[var(--muted)] rounded-full h-2">
              <div 
                className={`h-2 rounded-full bg-gradient-to-r ${getUrgencyColor(currentMonth.deadlineInfo.urgencyLevel)} transition-all duration-500`}
                style={{ width: `${currentMonth.completionPercentage}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-[var(--muted-foreground)]">
                {currentMonth.entriesCount} entradas registradas
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Meta: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} dias
              </span>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-3">
          <a
            href="/pt-BR/employee/timesheets"
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              summary.urgentActionRequired 
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                : 'bg-[var(--primary)] hover:opacity-90 text-[var(--primary-foreground)]'
            }`}
          >
            {currentMonth.hasTimesheet ? 'Continuar Timesheet' : 'Criar Timesheet'}
          </a>
          {currentMonth.status === 'rascunho' && currentMonth.completionPercentage >= 80 && (
            <button className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium text-sm hover:bg-[var(--muted)] transition-colors">
              Enviar para Aprovação
            </button>
          )}
        </div>
      </div>

      {/* Past Months Pending */}
      {pendingMonths.length > 0 && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--foreground)]">
                Pendências Anteriores
              </h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {pendingMonths.length} mês(es) pendente(s)
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {pendingMonths.slice(0, 3).map((month, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[var(--muted)]/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{month.month}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {!month.hasTimesheet ? 'Timesheet não criado' : getStatusText(month.status)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {month.isOverdue && (
                    <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-2 py-1 rounded-full font-medium">
                      Vencido
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {pendingMonths.length > 3 && (
              <div className="text-center pt-2">
                <span className="text-sm text-[var(--muted-foreground)]">
                  +{pendingMonths.length - 3} outros meses
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <button className="w-full text-center text-sm font-medium text-[var(--primary)] hover:opacity-80 transition-opacity">
              Ver todas as pendências
            </button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[var(--card)] rounded-lg p-3 text-center border border-[var(--border)]">
          <div className="text-2xl font-bold text-[var(--foreground)]">{summary.totalPending}</div>
          <div className="text-xs text-[var(--muted-foreground)]">Total Pendente</div>
        </div>
        <div className="bg-[var(--card)] rounded-lg p-3 text-center border border-[var(--border)]">
          <div className="text-2xl font-bold text-red-500">{summary.overdueCount}</div>
          <div className="text-xs text-[var(--muted-foreground)]">Vencidos</div>
        </div>
        <div className="bg-[var(--card)] rounded-lg p-3 text-center border border-[var(--border)]">
          <div className="text-2xl font-bold text-orange-500">{currentMonth.completionPercentage}%</div>
          <div className="text-xs text-[var(--muted-foreground)]">Atual</div>
        </div>
        <div className="bg-[var(--card)] rounded-lg p-3 text-center border border-[var(--border)]">
          <div className={`text-2xl font-bold ${
            summary.daysUntilNextDeadline <= 1 ? 'text-red-500' : 
            summary.daysUntilNextDeadline <= 7 ? 'text-orange-500' : 'text-green-500'
          }`}>
            {summary.daysUntilNextDeadline}
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">Dias Restantes</div>
        </div>
      </div>
    </div>
  );
}