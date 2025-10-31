import { emailLayout, EmailLocale } from '../email-layout';

export function timesheetApprovedEmail(data: {
  employeeName: string;
  managerName: string;
  period: string;
  timesheetUrl: string;
  locale: EmailLocale;
  branding?: { companyName?: string; logoUrl?: string };
}) {
  const t = {
    'pt-BR': {
      subject: 'Seu timesheet foi aprovado',
      greeting: 'Olá',
      message: 'Seu timesheet foi aprovado com sucesso.',
      period: 'Período',
      manager: 'Aprovado por',
      cta: 'Visualizar timesheet',
      regards: 'Atenciosamente'
    },
    'en-GB': {
      subject: 'Your timesheet has been approved',
      greeting: 'Hello',
      message: 'Your timesheet has been successfully approved.',
      period: 'Period',
      manager: 'Approved by',
      cta: 'View timesheet',
      regards: 'Best regards'
    }
  }[data.locale];

  const content = `
    <p>${t.greeting} ${data.employeeName},</p>
    <p>${t.message}</p>
    
    <div class="email-highlight">
      <p style="margin: 8px 0;"><strong>${t.period}:</strong> ${data.period}</p>
      <p style="margin: 8px 0;"><strong>${t.manager}:</strong> ${data.managerName}</p>
    </div>

    <p style="background-color: #d1fae5; padding: 12px; border-radius: 4px; border-left: 4px solid #10b981;">
      ✓ Seu timesheet foi processado e está pronto para os próximos passos.
    </p>

    <p style="margin-top: 30px; color: #666; font-size: 13px;">
      Obrigado por manter seus registros atualizados.
    </p>

    <p style="margin-top: 20px; color: #666; font-size: 13px;">
      ${t.regards},<br>
      <strong>PontoFlow - Timesheet Manager</strong>
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

