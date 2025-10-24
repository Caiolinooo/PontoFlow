"use client";
import { useState } from 'react';

type NotificationType = 
  | 'timesheet_rejected'
  | 'timesheet_approved'
  | 'timesheet_submitted'
  | 'deadline_reminder'
  | 'manager_pending_reminder'
  | 'timesheet_adjusted';

export default function NotificationsTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [formData, setFormData] = useState({
    type: 'timesheet_approved' as NotificationType,
    to: '',
    employeeName: 'João Silva',
    managerName: 'Maria Santos',
    period: '2025-10',
    reason: 'Horas incorretas',
    url: 'http://localhost:3000/pt-BR/timesheets',
    locale: 'pt-BR' as 'pt-BR' | 'en-GB',
    daysLeft: 3,
    periodLabel: 'Outubro 2025',
    name: 'João Silva',
    employees: [{ name: 'João Silva' }, { name: 'Pedro Costa' }],
    justification: 'Ajuste de horas extras'
  });

  const handleTest = async () => {
    if (!formData.to) {
      setResult('❌ Por favor, preencha o email de destino');
      return;
    }

    setLoading(true);
    setResult('⏳ Enviando...');

    try {
      const payload: any = {
        type: formData.type,
        to: formData.to,
        payload: {
          locale: formData.locale,
          url: formData.url
        }
      };

      // Add specific fields based on notification type
      switch (formData.type) {
        case 'timesheet_rejected':
          payload.payload = {
            ...payload.payload,
            employeeName: formData.employeeName,
            managerName: formData.managerName,
            period: formData.period,
            reason: formData.reason,
            annotations: [
              { field: 'hora_ini', message: 'Horário de início incorreto' },
              { message: formData.reason }
            ]
          };
          break;
        case 'timesheet_approved':
          payload.payload = {
            ...payload.payload,
            employeeName: formData.employeeName,
            managerName: formData.managerName,
            period: formData.period
          };
          break;
        case 'timesheet_submitted':
          payload.payload = {
            ...payload.payload,
            employeeName: formData.employeeName,
            period: formData.period
          };
          break;
        case 'deadline_reminder':
          payload.payload = {
            ...payload.payload,
            name: formData.name,
            periodLabel: formData.periodLabel,
            daysLeft: formData.daysLeft
          };
          break;
        case 'manager_pending_reminder':
          payload.payload = {
            ...payload.payload,
            managerName: formData.managerName,
            periodLabel: formData.periodLabel,
            employees: formData.employees
          };
          break;
        case 'timesheet_adjusted':
          payload.payload = {
            ...payload.payload,
            employeeName: formData.employeeName,
            managerName: formData.managerName,
            period: formData.period,
            justification: formData.justification
          };
          break;
      }

      const res = await fetch('/api/admin/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setResult(`✅ Email enviado com sucesso para ${formData.to}!`);
      } else {
        setResult(`❌ Erro: ${data.error || 'Falha ao enviar'}`);
      }
    } catch (error: any) {
      setResult(`❌ Erro: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Teste de Notificações</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Teste o envio de emails de notificação do sistema
        </p>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-6">
        {/* Email Destination */}
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Email de Destino *
          </label>
          <input
            type="email"
            value={formData.to}
            onChange={(e) => setFormData({ ...formData, to: e.target.value })}
            className="w-full px-3 py-2 rounded-md bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)]"
            placeholder="exemplo@email.com"
          />
        </div>

        {/* Notification Type */}
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Tipo de Notificação
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as NotificationType })}
            className="w-full px-3 py-2 rounded-md bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)]"
          >
            <option value="timesheet_approved">Timesheet Aprovado</option>
            <option value="timesheet_rejected">Timesheet Recusado</option>
            <option value="timesheet_submitted">Timesheet Enviado</option>
            <option value="deadline_reminder">Lembrete de Prazo</option>
            <option value="manager_pending_reminder">Lembrete para Gerente</option>
            <option value="timesheet_adjusted">Timesheet Ajustado</option>
          </select>
        </div>

        {/* Locale */}
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Idioma
          </label>
          <select
            value={formData.locale}
            onChange={(e) => setFormData({ ...formData, locale: e.target.value as 'pt-BR' | 'en-GB' })}
            className="w-full px-3 py-2 rounded-md bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)]"
          >
            <option value="pt-BR">🇧🇷 Português (BR)</option>
            <option value="en-GB">🇬🇧 English (UK)</option>
          </select>
        </div>

        {/* Dynamic Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(formData.type === 'timesheet_approved' || 
            formData.type === 'timesheet_rejected' || 
            formData.type === 'timesheet_submitted' ||
            formData.type === 'timesheet_adjusted') && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Nome do Colaborador
                </label>
                <input
                  type="text"
                  value={formData.employeeName}
                  onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Período
                </label>
                <input
                  type="text"
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)]"
                  placeholder="2025-10"
                />
              </div>
            </>
          )}

          {(formData.type === 'timesheet_approved' || 
            formData.type === 'timesheet_rejected' ||
            formData.type === 'timesheet_adjusted' ||
            formData.type === 'manager_pending_reminder') && (
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Nome do Gerente
              </label>
              <input
                type="text"
                value={formData.managerName}
                onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)]"
              />
            </div>
          )}

          {formData.type === 'timesheet_rejected' && (
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Motivo da Recusa
              </label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)]"
              />
            </div>
          )}

          {formData.type === 'deadline_reminder' && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Dias Restantes
                </label>
                <input
                  type="number"
                  value={formData.daysLeft}
                  onChange={(e) => setFormData({ ...formData, daysLeft: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-md bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)]"
                />
              </div>
            </>
          )}
        </div>

        {/* Test Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleTest}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar Email de Teste'}
          </button>
          {result && (
            <span className={`text-sm ${result.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {result}
            </span>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">ℹ️ Informações</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Configure as credenciais SMTP nas variáveis de ambiente</li>
          <li>• Verifique o console do servidor para logs de envio</li>
          <li>• Os emails podem levar alguns segundos para chegar</li>
          <li>• Verifique a pasta de spam se não receber</li>
        </ul>
      </div>
    </div>
  );
}

