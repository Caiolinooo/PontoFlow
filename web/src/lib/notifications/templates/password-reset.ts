import { emailLayout, EmailLocale } from '../email-layout';

export function passwordResetEmail(data: {
  name: string;
  resetUrl: string;
  locale: EmailLocale;
  branding?: { companyName?: string; logoUrl?: string };
}) {
  const t = {
    'pt-BR': {
      subject: 'Redefinição de senha',
      greeting: 'Olá',
      message: 'Você solicitou a redefinição de sua senha. Clique no botão abaixo para criar uma nova senha.',
      warning: 'Se você não solicitou esta redefinição, ignore este email. O link expira em 1 hora.',
      cta: 'Redefinir senha',
      regards: 'Atenciosamente',
      note: 'Nota de segurança',
      noteText: 'Por motivos de segurança, nunca compartilhe este link com outras pessoas.'
    },
    'en-GB': {
      subject: 'Password reset',
      greeting: 'Hello',
      message: 'You requested a password reset. Click the button below to create a new password.',
      warning: 'If you did not request this reset, please ignore this email. The link expires in 1 hour.',
      cta: 'Reset password',
      regards: 'Best regards',
      note: 'Security note',
      noteText: 'For security reasons, never share this link with others.'
    }
  }[data.locale];

  const content = `
    <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
      ${t.greeting} <strong>${data.name}</strong>,
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
      ${t.message}
    </p>
    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #856404; font-size: 14px;">
        ⚠️ ${t.warning}
      </p>
    </div>
    <div style="background-color: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #0c5460; font-size: 14px;">
        <strong>${t.note}:</strong> ${t.noteText}
      </p>
    </div>
  `;

  const html = emailLayout({
    locale: data.locale,
    subject: t.subject,
    content,
    ctaUrl: data.resetUrl,
    ctaText: t.cta,
    companyNameOverride: data.branding?.companyName,
    logoUrlOverride: data.branding?.logoUrl
  });

  return { subject: t.subject, html };
}

