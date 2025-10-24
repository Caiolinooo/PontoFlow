import { emailLayout, EmailLocale } from '../email-layout';

export function timesheetAdjustedEmail(data: {
  employeeName: string;
  managerName: string;
  period: string;
  justification: string;
  url: string;
  locale: EmailLocale;
  branding?: { companyName?: string; logoUrl?: string };
}) {
  const t = {
    'pt-BR': {
      subject: 'Ajuste no seu registro de ponto - ciência requerida',
      greeting: 'Olá',
      message: 'Um ajuste excepcional foi registrado em seu controle de jornada referente ao período abaixo.',
      period: 'Período',
      manager: 'Responsável',
      justification: 'Justificativa registrada',
      cta: 'Abrir timesheet',
      legal: 'Este ajuste foi realizado em conformidade com a legislação trabalhista (CLT art. 74 e Portaria MTP 671/2021) e registrado em nossa trilha de auditoria.',
      regards: 'Atenciosamente'
    },
    'en-GB': {
      subject: 'Adjustment to your time record - acknowledgement required',
      greeting: 'Hello',
      message: 'An exceptional adjustment has been registered in your time record for the period below.',
      period: 'Period',
      manager: 'Responsible',
      justification: 'Registered justification',
      cta: 'Open timesheet',
      legal: 'This adjustment complies with labour regulations (Brazil CLT art. 74 and Ordinance MTP 671/2021) and is recorded in our audit trail.',
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

    <p><strong>${t.justification}:</strong></p>
    <p style="background-color: #f3f4f6; padding: 12px; border-radius: 4px; border-left: 4px solid #6b7280;">${data.justification}</p>

    <p style="margin-top: 20px; color: #666; font-size: 13px;">${t.legal}</p>

    <p style="margin-top: 20px; color: #666; font-size: 13px;">
      ${t.regards},<br>
      <strong>Timesheet Manager</strong>
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

