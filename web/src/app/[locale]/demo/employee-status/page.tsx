import EmployeePendingStatus from '@/components/employee/EmployeePendingStatus';
import { getTranslations } from 'next-intl/server';

export default async function DemoEmployeeStatusPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });

  // Mock data for demonstration purposes
  const mockData = {
    currentMonth: {
      hasTimesheet: false,
      status: 'pendente' as const,
      entriesCount: 0,
      completionPercentage: 0,
      deadline: '2025-11-05T00:00:00.000Z',
      deadlineInfo: {
        daysLeft: 7,
        isOverdue: false,
        urgencyLevel: 'medium' as const
      },
      message: 'Timesheet pendente - 7 dias restantes'
    },
    pendingMonths: [
      {
        month: 'setembro 2025',
        status: 'pendente' as const,
        hasTimesheet: false,
        deadline: '2025-10-05T00:00:00.000Z',
        isOverdue: true
      },
      {
        month: 'agosto 2025',
        status: 'pendente' as const,
        hasTimesheet: false,
        deadline: '2025-09-05T00:00:00.000Z',
        isOverdue: true
      },
      {
        month: 'julho 2025',
        status: 'pendente' as const,
        hasTimesheet: false,
        deadline: '2025-08-05T00:00:00.000Z',
        isOverdue: true
      }
    ],
    summary: {
      totalPending: 3,
      overdueCount: 3,
      urgentActionRequired: false,
      overallUrgency: 'high' as const,
      nextDeadline: '2025-11-05T00:00:00.000Z',
      daysUntilNextDeadline: 7
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-[var(--foreground)]">
            📊 Sistema de Status de Pendências
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto">
            Nova funcionalidade: Status completo de pendências para colaboradores com 
            deadline, urgência e histórico de meses anteriores
          </p>
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-3xl mx-auto">
            <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
              ✨ Recursos Implementados
            </h2>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 text-left">
              <li>• <strong>Mês atual:</strong> Status de pendência para completar/somar</li>
              <li>• <strong>Meses anteriores:</strong> Lista de pendências não completadas</li>
              <li>• <strong>Prazo:</strong> Contagem regressiva para deadline</li>
              <li>• <strong>Urgência:</strong> Diferentes níveis de alerta visual</li>
              <li>• <strong>Progresso:</strong> Percentual de conclusão do timesheet</li>
              <li>• <strong>Ações rápidas:</strong> Links diretos para criar/continuar timesheet</li>
            </ul>
          </div>
        </div>

        {/* Demo Status Component */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Demonstração: Status de Pendências para Colaborador
          </h2>
          <p className="text-[var(--muted-foreground)] mb-6">
            Este é o novo sistema de status que mostra o exemplo de um colaborador com:
          </p>
          
          {/* Override the data in the component for demo */}
          <div suppressHydrationWarning>
            <EmployeePendingStatus />
          </div>
        </div>

        {/* API Information */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            Detalhes Técnicos
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">API Endpoint</h3>
              <code className="bg-[var(--muted)] p-3 rounded block text-sm">
                GET /api/employee/pending-status
              </code>
              <p className="text-sm text-[var(--muted-foreground)] mt-2">
                Retorna status completo de pendências para o colaborador autenticado
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Componente React</h3>
              <code className="bg-[var(--muted)] p-3 rounded block text-sm">
                EmployeePendingStatus.tsx
              </code>
              <p className="text-sm text-[var(--muted-foreground)] mt-2">
                Componente integrado ao dashboard com interface responsiva
              </p>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Como Usar
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center mt-0.5">1</div>
              <div>
                <h3 className="font-semibold text-[var(--foreground)]">Acesso ao Dashboard</h3>
                <p className="text-[var(--muted-foreground)] text-sm">
                  Colaboradores acessam o dashboard e veem automaticamente o status de pendências se não tiverem timesheet completo
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center mt-0.5">2</div>
              <div>
                <h3 className="font-semibold text-[var(--foreground)]">Monitoramento Visual</h3>
                <p className="text-[var(--muted-foreground)] text-sm">
                  Sistema mostra cores e alertas baseados na urgência (verde, amarelo, laranja, vermelho)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center mt-0.5">3</div>
              <div>
                <h3 className="font-semibold text-[var(--foreground)]">Ações Rápidas</h3>
                <p className="text-[var(--muted-foreground)] text-sm">
                  Botões diretos para criar timesheet, continuar preenchimento ou enviar para aprovação
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center mt-0.5">4</div>
              <div>
                <h3 className="font-semibold text-[var(--foreground)]">Histórico de Pendências</h3>
                <p className="text-[var(--muted-foreground)] text-sm">
                  Lista de meses anteriores com pendências e status de atraso
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Return Link */}
        <div className="text-center">
          <a 
            href={`/${locale}/dashboard`} 
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90 transition-opacity"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar ao Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}