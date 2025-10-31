'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { useUnifiedNotifications } from '@/lib/notifications/unified-notification-service';
import { useInAppNotifications } from '@/lib/notifications/in-app-notifications';

type NotificationType = 'timesheet_approved' | 'timesheet_rejected' | 'deadline_reminder' | 'timesheet_submitted';

export default function NotificationTestPanel() {
  const { sendNotification, requestPermission, permission, supported } = useUnifiedNotifications();
  const { unreadCount, show } = useInAppNotifications();
  const [testing, setTesting] = useState(false);
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [selectedType, setSelectedType] = useState<NotificationType>('timesheet_approved');
  const [sendToEmail, setSendToEmail] = useState(true);
  const [sendToBrowser, setSendToBrowser] = useState(true);

  const testCompleteNotification = async () => {
    if (!testEmail && sendToEmail) {
      setEmailResult({ success: false, message: 'Por favor, insira um email para enviar notificação por email' });
      return;
    }

    setTesting(true);
    setEmailResult(null);

    try {
      const results: string[] = [];

      // Send browser notification
      if (sendToBrowser) {
        try {
          await sendNotification({
            title: getTestTitle(selectedType),
            body: getTestBody(selectedType),
            userId: 'test-user-id',
            event: selectedType,
            data: {
              test: true,
              type: selectedType,
              timestamp: new Date().toISOString()
            },
            emailEnabled: false,
            pushEnabled: true,
            inAppEnabled: true
          });
          results.push('✅ Notificação do navegador enviada');
        } catch (error: any) {
          results.push(`❌ Erro no navegador: ${error.message}`);
        }
      }

      // Send email notification
      if (sendToEmail && testEmail) {
        try {
          const response = await fetch('/api/admin/notifications/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: getEmailType(selectedType),
              to: testEmail,
              payload: getEmailPayload(selectedType)
            })
          });

          const data = await response.json();

          if (response.ok) {
            results.push('✅ Email enviado com sucesso');
          } else {
            results.push(`❌ Erro no email: ${data.error}`);
          }
        } catch (error: any) {
          results.push(`❌ Erro ao enviar email: ${error.message}`);
        }
      }

      setEmailResult({
        success: results.every(r => r.startsWith('✅')),
        message: results.join('\n')
      });
    } catch (error: any) {
      setEmailResult({ success: false, message: `Erro: ${error.message}` });
    } finally {
      setTesting(false);
    }
  };

  const getTestTitle = (type: NotificationType): string => {
    const titles: Record<NotificationType, string> = {
      'timesheet_approved': '✅ Folha de Ponto Aprovada',
      'timesheet_rejected': '❌ Folha de Ponto Rejeitada',
      'deadline_reminder': '⏰ Lembrete de Prazo',
      'timesheet_submitted': '📋 Folha de Ponto Enviada'
    };
    return titles[type];
  };

  const getTestBody = (type: NotificationType): string => {
    const bodies: Record<NotificationType, string> = {
      'timesheet_approved': 'Sua folha de ponto de Dezembro 2025 foi aprovada pelo seu gerente.',
      'timesheet_rejected': 'Sua folha de ponto foi rejeitada devido a entradas faltando.',
      'deadline_reminder': 'Lembrete: Prazo de Dezembro 2025 termina em 2 dias.',
      'timesheet_submitted': 'Sua folha de ponto de Dezembro 2025 foi enviada para revisão.'
    };
    return bodies[type];
  };

  const getEmailType = (type: NotificationType): string => {
    const emailTypes: Record<NotificationType, string> = {
      'timesheet_approved': 'timesheet_approved',
      'timesheet_rejected': 'timesheet_rejected',
      'deadline_reminder': 'deadline_reminder',
      'timesheet_submitted': 'timesheet_submitted'
    };
    return emailTypes[type];
  };

  const getEmailPayload = (type: NotificationType): any => {
    const baseUrl = window.location.origin;

    const payloads: Record<NotificationType, any> = {
      'timesheet_approved': {
        employeeName: 'Usuário Teste',
        managerName: 'Gerente Teste',
        period: 'Dezembro 2025',
        url: `${baseUrl}/pt-BR/employee/timesheets`,
        locale: 'pt-BR'
      },
      'timesheet_rejected': {
        employeeName: 'Usuário Teste',
        managerName: 'Gerente Teste',
        period: 'Dezembro 2025',
        reason: 'Entradas faltando nos dias 15, 16 e 17',
        url: `${baseUrl}/pt-BR/employee/timesheets`,
        locale: 'pt-BR'
      },
      'deadline_reminder': {
        name: 'Usuário Teste',
        periodLabel: '01/12/2025 - 31/12/2025',
        daysLeft: 2,
        url: `${baseUrl}/pt-BR/employee/timesheets`,
        locale: 'pt-BR'
      },
      'timesheet_submitted': {
        employeeName: 'Usuário Teste',
        managerName: 'Gerente Teste',
        period: 'Dezembro 2025',
        url: `${baseUrl}/pt-BR/manager/pending`,
        locale: 'pt-BR'
      }
    };

    return payloads[type];
  };

  const testEmailSend = async () => {
    if (!testEmail) {
      setEmailResult({ success: false, message: 'Por favor, insira um email' });
      return;
    }

    setEmailTesting(true);
    setEmailResult(null);

    try {
      const response = await fetch('/api/admin/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEmail: true,
          to: testEmail
        })
      });

      const data = await response.json();

      if (response.ok) {
        setEmailResult({ success: true, message: data.message || 'Email enviado com sucesso!' });
      } else {
        setEmailResult({ success: false, message: data.error || 'Falha ao enviar email' });
      }
    } catch (error: any) {
      setEmailResult({ success: false, message: `Erro: ${error.message}` });
    } finally {
      setEmailTesting(false);
    }
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm p-6 text-[var(--card-foreground)]">
      <h2 className="text-xl font-semibold mb-4">🧪 Notification System Test Panel</h2>
      
      {/* System Status */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between">
          <span>Unread Notifications:</span>
          <span className="font-mono text-lg">{unreadCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Push Support:</span>
          <span className={`px-2 py-1 rounded text-sm ${supported ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {supported ? 'Available' : 'Not Supported'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Push Permission:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            permission === 'granted' ? 'bg-green-100 text-green-800' : 
            permission === 'denied' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {permission}
          </span>
        </div>
      </div>

      {/* Permission Button */}
      {permission !== 'granted' && (
        <div className="mb-6">
          <Button 
            onClick={requestPermission}
            variant="primary"
            disabled={!supported}
            className="w-full"
          >
            {supported ? 'Enable Push Notifications' : 'Push Not Supported'}
          </Button>
        </div>
      )}

      {/* Complete Notification Test */}
      <div className="mb-6 p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
        <h3 className="font-medium text-lg mb-4">🧪 Teste Completo de Notificações</h3>

        <div className="space-y-4">
          {/* Notification Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Notificação:</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as NotificationType)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--input)] text-[var(--foreground)]"
            >
              <option value="timesheet_approved">✅ Folha de Ponto Aprovada</option>
              <option value="timesheet_rejected">❌ Folha de Ponto Rejeitada</option>
              <option value="deadline_reminder">⏰ Lembrete de Prazo</option>
              <option value="timesheet_submitted">📋 Folha de Ponto Enviada</option>
            </select>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Email de destino:</label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="seu-email@exemplo.com"
              className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--input)] text-[var(--foreground)]"
            />
          </div>

          {/* Delivery Options */}
          <div className="space-y-2">
            <label className="block text-sm font-medium mb-2">Enviar para:</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendToEmail}
                  onChange={(e) => setSendToEmail(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">📧 Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendToBrowser}
                  onChange={(e) => setSendToBrowser(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">🔔 Navegador</span>
              </label>
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={testCompleteNotification}
            disabled={testing || (!sendToEmail && !sendToBrowser) || (sendToEmail && !testEmail)}
            className="w-full"
          >
            {testing ? 'Enviando...' : '🚀 Enviar Notificação de Teste'}
          </Button>

          {/* Result */}
          {emailResult && (
            <div className={`p-3 rounded whitespace-pre-line ${emailResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {emailResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Quick Email Test */}
      <div className="mb-6 p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
        <h3 className="font-medium text-lg mb-3">📧 Teste Rápido de Email</h3>
        <p className="text-sm text-[var(--muted-foreground)] mb-3">
          Envia um email simples para verificar se a configuração SMTP está funcionando.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Email de destino:</label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="seu-email@exemplo.com"
              className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--input)] text-[var(--foreground)]"
            />
          </div>
          <Button
            onClick={testEmailSend}
            disabled={emailTesting || !testEmail}
            className="w-full"
          >
            {emailTesting ? 'Enviando...' : '📧 Enviar Email de Teste Simples'}
          </Button>
        </div>
      </div>

      {/* Manual Toast Test */}
      <div className="mb-6 p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
        <h4 className="font-medium mb-2">Manual Toast Tests</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => show({ id: '1', type: 'success', title: 'Success', message: 'This is a success message' })}
            variant="outline"
            size="sm"
          >
            Success Toast
          </Button>
          <Button
            onClick={() => show({ id: '2', type: 'error', title: 'Error', message: 'This is an error message' })}
            variant="outline"
            size="sm"
          >
            Error Toast
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-[var(--surface)] rounded-lg">
        <h4 className="font-medium mb-2">Instructions:</h4>
        <ul className="text-sm space-y-1 text-[var(--muted-foreground)]">
          <li>• Click test buttons to trigger different notification types</li>
          <li>• Check the notification badge in the header</li>
          <li>• Open the notification modal to view persistent notifications</li>
          <li>• Toast notifications appear in the bottom-right corner</li>
          <li>• Push notifications require browser permission</li>
        </ul>
      </div>
    </div>
  );
}