import { emailLayout, EmailLocale } from '../email-layout';

export function timesheetSubmittedEmail(data: {
  employeeName: string;
  period: string;
  url: string;
  locale: EmailLocale;
  branding?: { companyName?: string; logoUrl?: string };
}) {
  const t = {
    'pt-BR': {
      subject: 'Novo timesheet enviado para aprovação',
      greeting: 'Olá',
      message: 'Um novo timesheet foi enviado para sua aprovação.',
      employee: 'Colaborador',
      period: 'Período',
      action: 'Ação necessária',
      cta: 'Abrir revisão',
      regards: 'Atenciosamente'
    },
    'en-GB': {
      subject: 'New timesheet submitted for approval',
      greeting: 'Hello',
      message: 'A new timesheet has been submitted for your approval.',
      employee: 'Employee',
      period: 'Period',
      action: 'Action required',
      cta: 'Open review',
      regards: 'Best regards'
    }
  }[data.locale];

  const content = `
    <p>${t.greeting},</p>
    <p>${t.message}</p>

    <div class="email-highlight">
      <p style="margin: 8px 0;"><strong>${t.employee}:</strong> ${data.employeeName}</p>
      <p style="margin: 8px 0;"><strong>${t.period}:</strong> ${data.period}</p>
    </div>

    <p style="background-color: #dbeafe; padding: 12px; border-radius: 4px; border-left: 4px solid #0284c7;">
      <strong>${t.action}:</strong> Por favor, revise e aprove ou recuse este timesheet.
    </p>

    <p style="margin-top: 30px; color: #666; font-size: 13px;">
      Você pode revisar todos os detalhes do timesheet clicando no botão abaixo.
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
    ctaUrl: data.url,
    ctaText: t.cta,
    companyNameOverride: data.branding?.companyName,
    logoUrlOverride: data.branding?.logoUrl
  });

  return { subject: t.subject, html };
}

