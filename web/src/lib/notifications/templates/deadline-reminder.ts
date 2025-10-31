import { emailLayout, EmailLocale } from '../email-layout';

export function deadlineReminderEmail(data: {
  name: string;
  periodLabel: string;
  daysLeft: number;
  url: string;
  locale: EmailLocale;
}) {
  const t = {
    'pt-BR': {
      subject: (d: number) => d > 0 ? 'Lembrete: Timesheet pendente' : 'Urgente: Prazo de timesheet hoje',
      greeting: 'Olá',
      msg: (p: string, d: number) =>
        d > 0
          ? `Seu timesheet do período ${p} está pendente. Faltam <strong>${d} dia(s)</strong> para o prazo.`
          : `O prazo para o período ${p} é <strong>hoje</strong>. Por favor, finalize agora.`,
      period: 'Período',
      cta: 'Abrir timesheet',
      regards: 'Atenciosamente'
    },
    'en-GB': {
      subject: (d: number) => d > 0 ? 'Reminder: Timesheet pending' : 'Urgent: Timesheet deadline today',
      greeting: 'Hello',
      msg: (p: string, d: number) =>
        d > 0
          ? `Your timesheet for period ${p} is pending. <strong>${d} day(s)</strong> left until the deadline.`
          : `The deadline for period ${p} is <strong>today</strong>. Please complete it now.`,
      period: 'Period',
      cta: 'Open timesheet',
      regards: 'Best regards'
    }
  }[data.locale];

  const urgencyColor = data.daysLeft === 0 ? '#fee2e2' : '#fef3c7';
  const urgencyBorder = data.daysLeft === 0 ? '#ef4444' : '#f59e0b';

  const content = `
    <p>${t.greeting} ${data.name},</p>
    <p>${t.msg(data.periodLabel, data.daysLeft)}</p>

    <div class="email-highlight">
      <p style="margin: 8px 0;"><strong>${t.period}:</strong> ${data.periodLabel}</p>
    </div>

    <p style="background-color: ${urgencyColor}; padding: 12px; border-radius: 4px; border-left: 4px solid ${urgencyBorder};">
      ${data.daysLeft === 0
        ? '⚠️ <strong>Ação imediata necessária!</strong> O prazo é hoje.'
        : `📅 <strong>Tempo restante:</strong> ${data.daysLeft} dia(s)`}
    </p>

    <p style="margin-top: 30px; color: #666; font-size: 13px;">
      Por favor, acesse o sistema e finalize seu timesheet o quanto antes.
    </p>

    <p style="margin-top: 20px; color: #666; font-size: 13px;">
      ${t.regards},<br>
      <strong>PontoFlow - Timesheet Manager</strong>
    </p>
  `;

  const html = emailLayout({
    locale: data.locale,
    subject: t.subject(data.daysLeft),
    content,
    ctaUrl: data.url,
    ctaText: t.cta
  });

  return { subject: t.subject(data.daysLeft), html };
}

