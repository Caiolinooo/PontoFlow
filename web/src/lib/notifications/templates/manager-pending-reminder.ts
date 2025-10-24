import { emailLayout, EmailLocale } from '../email-layout';

export function managerPendingReminderEmail(data: {
  managerName: string;
  periodLabel: string;
  employees: Array<{name: string}>;
  locale: EmailLocale;
}) {
  const t = {
    'pt-BR': {
      subject: 'Pendências de timesheet dos colaboradores',
      greeting: 'Olá',
      intro: (p: string, count: number) =>
        `Você possui <strong>${count} colaborador(es)</strong> com timesheet pendente no período ${p}.`,
      listTitle: 'Colaboradores com pendências:',
      action: 'Ação necessária',
      cta: 'Abrir fila de pendências',
      regards: 'Atenciosamente'
    },
    'en-GB': {
      subject: 'Employees with pending timesheets',
      greeting: 'Hello',
      intro: (p: string, count: number) =>
        `You have <strong>${count} employee(s)</strong> with pending timesheets for period ${p}.`,
      listTitle: 'Employees with pending timesheets:',
      action: 'Action required',
      cta: 'Open pending queue',
      regards: 'Best regards'
    }
  }[data.locale];

  const employeeList = data.employees.length
    ? `
      <div class="email-highlight">
        <strong>${t.listTitle}</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${data.employees.map(e => `<li style="margin: 5px 0; font-size: 14px;">${e.name}</li>`).join('')}
        </ul>
      </div>
    `
    : '';

  const content = `
    <p>${t.greeting} ${data.managerName},</p>
    <p>${t.intro(data.periodLabel, data.employees.length)}</p>
    
    ${employeeList}

    <p style="background-color: #dbeafe; padding: 12px; border-radius: 4px; border-left: 4px solid #0284c7;">
      <strong>${t.action}:</strong> Por favor, revise e processe os timesheets pendentes.
    </p>

    <p style="margin-top: 30px; color: #666; font-size: 13px;">
      Acesse a fila de pendências para visualizar todos os timesheets que aguardam sua aprovação.
    </p>

    <p style="margin-top: 20px; color: #666; font-size: 13px;">
      ${t.regards},<br>
      <strong>ABZ Group - Timesheet Manager</strong>
    </p>
  `;

  const html = emailLayout({
    locale: data.locale,
    subject: t.subject,
    content,
    ctaUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://timesheet.abzgroup.com'}/${data.locale}/manager/pending`,
    ctaText: t.cta
  });

  return { subject: t.subject, html };
}

