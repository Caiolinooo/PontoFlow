import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { testEmailConfiguration, sendTestEmail as sendTestEmailService } from '@/lib/email/test-service';
import nodemailer from 'nodemailer';

/**
 * Test email configuration endpoint
 * 
 * Tests SMTP configuration by attempting to create a transporter
 * and optionally sending a test email
 * 
 * POST /api/admin/email/test
 * Body: {
 *   provider: 'smtp' | 'gmail' | 'exchange-oauth2',
 *   host?: string,
 *   port?: number,
 *   user?: string,
 *   pass?: string,
 *   from?: string,
 *   azureTenantId?: string,
 *   azureClientId?: string,
 *   azureClientSecret?: string,
 *   sendTestEmail?: boolean,
 *   testEmail?: string
 * }
 * 
 * Authorization: Requires ADMIN role
 */
export async function POST(req: NextRequest) {
  try {
    await requireApiRole(['ADMIN']);
    
    let body = {};
    try {
      body = await req.json();
    } catch (jsonError) {
      return NextResponse.json({ 
        error: 'Invalid JSON in request body' 
      }, { status: 400 });
    }
    
    const {
      provider = 'smtp',
      host = process.env.SMTP_HOST || 'smtp.gmail.com',
      port = parseInt(process.env.SMTP_PORT || '587'),
      user = process.env.SMTP_USER,
      pass = process.env.SMTP_PASS,
      from = process.env.MAIL_FROM || 'admin@example.com',
      azureTenantId = process.env.AZURE_TENANT_ID,
      azureClientId = process.env.AZURE_CLIENT_ID,
      azureClientSecret = process.env.AZURE_CLIENT_SECRET,
      sendTestEmail: shouldSendTestEmail = false,
      testEmail = user
    } = body as any;

    // Validate required fields
    if (!user || !pass) {
      return NextResponse.json({ 
        error: 'Email configuration incomplete: user and password are required' 
      }, { status: 400 });
    }

    let testResult;
    try {
      switch (provider) {
        case 'smtp':
        case 'gmail':
          testResult = await testSmtpConfiguration({ host, port, user, pass, from });
          break;
        case 'exchange-oauth2':
          testResult = await testExchangeOAuth2Configuration({ 
            azureTenantId, 
            azureClientId, 
            azureClientSecret, 
            from,
            user 
          });
          break;
        default:
          return NextResponse.json({ 
            error: `Unsupported email provider: ${provider}. Supported: smtp, gmail, exchange-oauth2` 
          }, { status: 400 });
      }
    } catch (configError: any) {
      return NextResponse.json({
        success: false,
        error: 'Configuration test failed',
        details: configError.message,
        type: configError.code || 'CONFIG_ERROR'
      }, { status: 400 });
    }

    // Optionally send a test email
    let emailSent = false;
    let emailError = null;
    if (shouldSendTestEmail && testEmail && testResult.success) {
      try {
        await sendTestEmailService({
          provider,
          host,
          port,
          user,
          pass,
          from,
          azureTenantId,
          azureClientId,
          azureClientSecret
        }, testEmail);
        emailSent = true;
      } catch (sendError: any) {
        emailError = sendError.message;
      }
    }

    return NextResponse.json({
      success: true,
      provider,
      configuration: {
        host,
        port,
        user: user ? maskEmail(user) : null,
        from,
        encrypted: port === 465 || port === 587
      },
      transportTest: testResult,
      emailTest: {
        sent: emailSent,
        to: shouldSendTestEmail ? maskEmail(testEmail) : null,
        error: emailError
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Email test error:', error);
    
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET endpoint to show email configuration status
 */
export async function GET() {
  try {
    await requireApiRole(['ADMIN']);
    
    const config = {
      smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        user: process.env.SMTP_USER ? maskEmail(process.env.SMTP_USER) : null,
        configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
        from: process.env.MAIL_FROM || null
      },
      oauth2: {
        tenantId: process.env.AZURE_TENANT_ID ? maskGuid(process.env.AZURE_TENANT_ID) : null,
        clientId: process.env.AZURE_CLIENT_ID ? maskGuid(process.env.AZURE_CLIENT_ID) : null,
        configured: !!(process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET),
        from: process.env.MAIL_FROM || null
      }
    };
    
    return NextResponse.json({
      currentConfiguration: config,
      supportedProviders: ['smtp', 'gmail', 'exchange-oauth2'],
      testEndpoint: 'POST /api/admin/email/test'
    });
    
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

async function testSmtpConfiguration({ host, port, user, pass, from }: any) {
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    // Test connection
    await transporter.verify();
    
    return {
      success: true,
      method: 'SMTP',
      secured: port === 465,
      message: 'SMTP configuration is valid'
    };
  } catch (error: any) {
    throw new Error(`SMTP test failed: ${error.message}`);
  }
}

async function testExchangeOAuth2Configuration({ azureTenantId, azureClientId, azureClientSecret, from, user }: any) {
  try {
    if (!azureTenantId || !azureClientId || !azureClientSecret) {
      throw new Error('OAuth2 configuration incomplete: tenant ID, client ID, and secret are required');
    }

    // Test OAuth2 token acquisition (simplified check)
    // In production, this would make a real token request
    const tokenEndpoint = `https://login.microsoftonline.com/${azureTenantId}/oauth2/v2.0/token`;
    
    // Basic validation of GUID format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(azureTenantId)) {
      throw new Error('Invalid Azure Tenant ID format');
    }
    if (!guidRegex.test(azureClientId)) {
      throw new Error('Invalid Azure Client ID format');
    }
    
    return {
      success: true,
      method: 'OAuth2',
      message: 'OAuth2 configuration format is valid',
      requiresTokenTest: 'Production testing would require actual token acquisition'
    };
  } catch (error: any) {
    throw new Error(`OAuth2 test failed: ${error.message}`);
  }
}

async function sendTestEmail(config: any) {
  const { provider, host, port, user, pass, from, to, azureTenantId, azureClientId, azureClientSecret } = config;
  
  let transporter;
  
  if (provider === 'exchange-oauth2') {
    // For OAuth2, we would need to implement token-based auth
    // For now, throw error indicating OAuth2 sending is not implemented
    throw new Error('OAuth2 email sending not yet implemented in test endpoint');
  }
  
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  const mailOptions = {
    from,
    to,
    subject: '🧪 PontoFlow - Email Configuration Test',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #3b82f6; color: white; padding: 20px; text-align: center;">
          <h1>🧪 Email Configuration Test</h1>
        </div>
        <div style="padding: 20px; background: #f9fafb;">
          <p>Este é um email de teste do sistema PontoFlow.</p>
          <p><strong>Status:</strong> ✅ Sucesso!</p>
          <p><strong>Configuração:</strong> ${provider.toUpperCase()} via ${host}:${port}</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          <hr style="margin: 20px 0; border: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">
            Este email foi enviado automaticamente para testar as configurações de email do sistema.
            Se recebeu esta mensagem, suas configurações estão funcionando corretamente.
          </p>
        </div>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  
  const maskedLocal = local.length > 2 
    ? local.substring(0, 2) + '*'.repeat(local.length - 2)
    : local;
    
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.length > 1 
    ? domainParts[0].substring(0, 2) + '*'.repeat(domainParts[0].length - 2) + '.' + domainParts.slice(1).join('.')
    : domain;
    
  return `${maskedLocal}@${maskedDomain}`;
}

function maskGuid(guid: string): string {
  if (guid.length < 8) return guid;
  return guid.substring(0, 4) + '-****-' + guid.substring(guid.length - 4);
}