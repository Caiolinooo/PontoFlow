import nodemailer from 'nodemailer';
import { getServiceSupabase } from '@/lib/supabase/server';
import { decryptSmtpPassword } from '@/lib/email/smtp-encryption';

type SMTPConfig = {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from?: string;
  fromName?: string;
};

// Global/default SMTP configuration from environment variables
const defaultSmtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
const defaultSmtpPort = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
const defaultSmtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
const defaultSmtpPass = process.env.SMTP_PASS || process.env.GMAIL_PASSWORD || process.env.EMAIL_PASSWORD;
const defaultMailFrom = process.env.MAIL_FROM || process.env.EMAIL_FROM;

const defaultSmtp: SMTPConfig = {
  host: defaultSmtpHost,
  port: defaultSmtpPort,
  user: defaultSmtpUser,
  pass: defaultSmtpPass,
  from: defaultMailFrom
};

/**
 * Get SMTP configuration for a specific tenant
 * Falls back to global configuration if tenant doesn't have custom SMTP
 */
async function getTenantSmtpConfig(tenantId?: string): Promise<SMTPConfig> {
  // If no tenant ID provided, use default config
  if (!tenantId) {
    return defaultSmtp;
  }

  try {
    const supabase = getServiceSupabase();
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      console.warn(`[email-service] Failed to fetch tenant ${tenantId}, using default SMTP`);
      return defaultSmtp;
    }

    const smtpSettings = tenant.settings?.smtp;

    // Check if tenant has custom SMTP configured and enabled
    if (smtpSettings && smtpSettings.enabled === true) {
      const { host, port, user, password_encrypted, from, from_name } = smtpSettings;

      // Validate required fields
      if (!host || !port || !user || !password_encrypted || !from) {
        console.warn(`[email-service] Tenant ${tenantId} has incomplete SMTP config, using default`);
        return defaultSmtp;
      }

      // Decrypt password
      let decryptedPassword: string;
      try {
        decryptedPassword = decryptSmtpPassword(password_encrypted);
      } catch (decryptError) {
        console.error(`[email-service] Failed to decrypt SMTP password for tenant ${tenantId}:`, decryptError);
        return defaultSmtp;
      }

      console.log(`[email-service] Using tenant-specific SMTP for tenant ${tenantId}`);
      return {
        host,
        port: Number(port),
        user,
        pass: decryptedPassword,
        from,
        fromName: from_name
      };
    }

    // Tenant doesn't have custom SMTP, use default
    return defaultSmtp;
  } catch (error) {
    console.error(`[email-service] Error fetching tenant SMTP config:`, error);
    return defaultSmtp;
  }
}

/**
 * Validates email address to prevent header injection attacks
 * Blocks: newlines, null bytes, and invalid email formats
 */
function validateEmail(email: string): boolean {
  // Check for header injection attempts (newlines, carriage returns, null bytes)
  if (/[\r\n\0]/.test(email)) {
    return false;
  }

  // Validate email format with strict regex
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

export async function sendEmail({
  to,
  subject,
  html,
  tenantId
}: {
  to: string;
  subject: string;
  html: string;
  tenantId?: string;
}) {
  // SECURITY: Validate email to prevent header injection
  if (!validateEmail(to)) {
    console.error('[email-service] Invalid or potentially malicious email address:', to);
    throw new Error('Invalid email address');
  }

  // Get SMTP config for the tenant (or default)
  const smtp = await getTenantSmtpConfig(tenantId);

  if (!smtp.user || !smtp.pass) {
    // Graceful no-op when credentials are missing (keeps runtime stable)
    console.warn('[email-service] Email disabled: missing credentials. Skipping send to', to);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass }
  });

  // Generate unique Message-ID for better deliverability
  const domain = smtp.from?.split('@')[1] || 'pontoflow.com';
  const messageId = `<${Date.now()}.${Math.random().toString(36).substring(7)}@${domain}>`;

  // Format "from" field with name if provided
  const fromField = smtp.fromName
    ? `"${smtp.fromName}" <${smtp.from || smtp.user}>`
    : smtp.from || smtp.user;

  await transporter.sendMail({
    from: fromField,
    to,
    subject,
    html,
    headers: {
      'Message-ID': messageId,
      'X-Mailer': 'PontoFlow Timesheet Manager',
      'X-Priority': '3',
      'Reply-To': smtp.from || smtp.user,
      'List-Unsubscribe': `<mailto:${smtp.from || smtp.user}?subject=Unsubscribe>`,
    }
  });
}

