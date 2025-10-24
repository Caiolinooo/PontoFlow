import nodemailer from 'nodemailer';

type SMTPConfig = {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from?: string;
};

const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_PASSWORD || process.env.EMAIL_PASSWORD;
const mailFrom = process.env.MAIL_FROM || process.env.EMAIL_FROM;

const smtp: SMTPConfig = {
  host: smtpHost,
  port: smtpPort,
  user: smtpUser,
  pass: smtpPass,
  from: mailFrom
};

export async function sendEmail({
  to,
  subject,
  html
}: {
  to: string;
  subject: string;
  html: string;
}) {
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

  await transporter.sendMail({
    from: smtp.from || smtp.user,
    to,
    subject,
    html
  });
}

