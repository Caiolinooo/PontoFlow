import { emailLayout, EmailLocale } from '../email-layout';

export function timesheetRejectedEmail(data: {
  employeeName: string;
  managerName: string;
  period: string;
  reason: string;
  annotations: Array<{ field?: string; message: string }>;
  timesheetUrl: string;
  locale: EmailLocale;
  branding?: { companyName?: string; logoUrl?: string };
}) {
  const t = {
    'pt-BR': {
      subject: 'Seu timesheet foi recusado',
      greeting: 'Olá',
      message: 'Seu timesheet foi recusado e requer correções antes de ser reenviado.',
      period: 'Período',
      manager: 'Gerente responsável',
      reason: 'Motivo da recusa',
      corrections: 'Detalhes das correções necessárias',
      cta: 'Abrir e corrigir',
      regards: 'Atenciosamente'
    },
    'en-GB': {
      subject: 'Your timesheet has been rejected',
      greeting: 'Hello',
      message: 'Your timesheet has been rejected and requires corrections before resubmission.',
      period: 'Period',
      manager: 'Responsible manager',
      reason: 'Reason for rejection',
      corrections: 'Details of required corrections',
      cta: 'Open and correct',
      regards: 'Best regards'
    }
  }[data.locale];

  const annotationsHtml = data.annotations?.length
    ? `
      <div class="email-highlight">
        <strong>${t.corrections}:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${data.annotations
            .map(a => `
              <li style="margin: 8px 0; font-size: 14px;">
                ${a.field ? `<strong>[${a.field}]</strong> ` : ''}${a.message}
              </li>
            `)
            .join('')}
        </ul>
      </div>
    `
    : '';

  const content = `
    <p>${t.greeting} ${data.employeeName},</p>
    <p>${t.message}</p>

    <div class="email-highlight">
      <p style="margin: 8px 0;"><strong>${t.period}:</strong> ${data.period}</p>
      <p style="margin: 8px 0;"><strong>${t.manager}:</strong> ${data.managerName}</p>
    </div>

    <p><strong>${t.reason}:</strong></p>
    <p style="background-color: #fef3c7; padding: 12px; border-radius: 4px; border-left: 4px solid #f59e0b;">
      ${data.reason}
    </p>

    ${annotationsHtml}

    <p style="margin-top: 30px; color: #666; font-size: 13px;">
      Por favor, revise as correções necessárias e reenvie seu timesheet assim que possível.
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
    ctaUrl: data.timesheetUrl,
    ctaText: t.cta,
    companyNameOverride: data.branding?.companyName,
    logoUrlOverride: data.branding?.logoUrl
  });

  return { subject: t.subject, html };
}

