/**
 * Email Layout Corporativo (PontoFlow)
 * Layout base com logo, cabeçalho, rodapé e CSS inline
 * Suporta i18n (pt-BR/en-GB)
 */

export type EmailLocale = 'pt-BR' | 'en-GB';

interface EmailLayoutConfig {
  locale: EmailLocale;
  subject: string;
  content: string;
  ctaUrl?: string;
  ctaText?: string;
  // Branding overrides (multi-tenant)
  companyNameOverride?: string;
  logoUrlOverride?: string;
  bannerUrlOverride?: string;
  watermarkUrlOverride?: string;
  primaryColorOverride?: string;
  secondaryColorOverride?: string;
}

const defaultEmailConfig = {
  companyName: 'PontoFlow',
  logoUrl: process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/brand/logo.svg` : '/brand/logo.svg',
  primaryColor: '#005dff', // primary
  secondaryColor: '#6339F5', // secondary
  accentColor: '#10B981', // accent
  backgroundColor: '#F5F5F5', // background
  textDark: '#111111', // text-dark
  borderColor: '#E5E7EB',
  appUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
};

const i18nFooter: Record<EmailLocale, string> = {
  'pt-BR': 'Todos os direitos reservados.',
  'en-GB': 'All rights reserved.'
};

const i18nDisclaimer: Record<EmailLocale, string> = {
  'pt-BR': 'Este é um email automático. Por favor, não responda diretamente. Se tiver dúvidas, entre em contato com o suporte.',
  'en-GB': 'This is an automated email. Please do not reply directly. If you have questions, contact support.'
};

const i18nUnsubscribe: Record<EmailLocale, string> = {
  'pt-BR': 'Cancelar inscrição',
  'en-GB': 'Unsubscribe',
};

export function emailLayout(config: EmailLayoutConfig): string {
  const {
    locale,
    subject,
    content,
    ctaUrl,
    ctaText,
    companyNameOverride,
    logoUrlOverride,
    bannerUrlOverride,
    watermarkUrlOverride,
    primaryColorOverride,
    secondaryColorOverride
  } = config;
  const year = new Date().getFullYear();

  const emailConfig = {
    ...defaultEmailConfig,
    companyName: companyNameOverride || defaultEmailConfig.companyName,
    logoUrl: logoUrlOverride || defaultEmailConfig.logoUrl,
    bannerUrl: bannerUrlOverride,
    watermarkUrl: watermarkUrlOverride,
    primaryColor: primaryColorOverride || defaultEmailConfig.primaryColor,
    secondaryColor: secondaryColorOverride || defaultEmailConfig.secondaryColor,
  };

  const ctaButton = ctaUrl && ctaText ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${ctaUrl}" style="
        display: inline-block;
        background-color: ${emailConfig.primaryColor};
        color: white;
        text-decoration: none;
        padding: 12px 30px;
        border-radius: 6px;
        font-weight: bold;
        font-size: 16px;
      ">${ctaText}</a>
    </div>
  ` : '';

  const bannerImage = emailConfig.bannerUrl ? `
    <div style="width: 100%; max-height: 150px; overflow: hidden;">
      <img src="${emailConfig.bannerUrl}" alt="Banner" style="width: 100%; height: auto; display: block;">
    </div>
  ` : '';

  const watermarkStyle = emailConfig.watermarkUrl ? `
    background-image: url('${emailConfig.watermarkUrl}');
    background-repeat: no-repeat;
    background-position: center;
    background-size: 40%;
    background-blend-mode: overlay;
    opacity: 0.95;
  ` : '';

  return `
    <!DOCTYPE html>
    <html lang="${locale}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          line-height: 1.6;
          color: ${emailConfig.textDark};
          margin: 0;
          padding: 0;
          background-color: ${emailConfig.backgroundColor};
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border: 1px solid ${emailConfig.borderColor};
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        .email-header {
          background: linear-gradient(135deg, ${emailConfig.primaryColor} 0%, ${emailConfig.secondaryColor} 100%);
          padding: 30px 20px;
          text-align: center;
        }
        .email-logo {
          max-width: 180px;
          height: auto;
          display: block;
          margin: 0 auto;
        }
        .email-body {
          padding: 30px 20px;
          color: ${emailConfig.textDark};
        }
        .email-body h1, .email-body h2, .email-body h3 {
          color: ${emailConfig.primaryColor};
          margin-top: 0;
        }
        .email-body p {
          margin: 15px 0;
          font-size: 14px;
          line-height: 1.8;
        }
        .email-body a {
          color: ${emailConfig.primaryColor};
          text-decoration: none;
        }
        .email-body a:hover {
          text-decoration: underline;
        }
        .email-highlight {
          background-color: ${emailConfig.backgroundColor};
          border-left: 4px solid ${emailConfig.secondaryColor};
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .email-footer {
          background-color: ${emailConfig.backgroundColor};
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid ${emailConfig.borderColor};
        }
        .email-footer p {
          margin: 5px 0;
        }
        .email-divider {
          height: 1px;
          background-color: ${emailConfig.borderColor};
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        ${bannerImage}
        <div class="email-header">
          <img src="${emailConfig.logoUrl}" alt="${emailConfig.companyName}" class="email-logo">
        </div>
        <div class="email-body" style="${watermarkStyle}">
          ${content}
          ${ctaButton}
        </div>
        <div class="email-footer">
          <p>&copy; ${year} ${emailConfig.companyName}. ${i18nFooter[locale]}</p>
          <p style="color: #999; margin-top: 10px;">${i18nDisclaimer[locale]}</p>
          <p style="color: #999; margin-top: 10px; font-size: 12px;">
            <a href="mailto:${emailConfig.companyName.toLowerCase().replace(/\s+/g, '')}@pontoflow.com?subject=Unsubscribe" style="color: #999; text-decoration: underline;">
              ${i18nUnsubscribe[locale]}
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

