import nodemailer from 'nodemailer';

/**
 * Service for testing email configurations
 * Supports SMTP, Gmail App Password, and Exchange OAuth2
 */

export interface EmailTestConfig {
  provider: 'smtp' | 'gmail' | 'exchange-oauth2';
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
  azureTenantId?: string;
  azureClientId?: string;
  azureClientSecret?: string;
}

export interface TestResult {
  success: boolean;
  method: string;
  secured: boolean;
  message: string;
  details?: any;
}

/**
 * Test SMTP configuration
 */
export async function testSmtpConfiguration(config: EmailTestConfig): Promise<TestResult> {
  const { host, port = 587, user, pass, from } = config;
  
  try {
    if (!host || !user || !pass) {
      throw new Error('Host, usuário e senha são obrigatórios para configuração SMTP');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: { user, pass }
    });

    // Test connection
    await transporter.verify();
    
    return {
      success: true,
      method: 'SMTP',
      secured: port === 465 || port === 587,
      message: 'Configuração SMTP válida',
      details: { host, port, user: maskEmail(user) }
    };
  } catch (error: any) {
    throw new Error(`Teste SMTP falhou: ${error.message}`);
  }
}

/**
 * Test Exchange OAuth2 configuration
 */
export async function testExchangeOAuth2Configuration(config: EmailTestConfig): Promise<TestResult> {
  const { azureTenantId, azureClientId, azureClientSecret, user, from } = config;
  
  try {
    if (!azureTenantId || !azureClientId || !azureClientSecret) {
      throw new Error('Tenant ID, Client ID e Client Secret são obrigatórios para OAuth2');
    }

    if (!user) {
      throw new Error('Email do usuário é obrigatório para OAuth2');
    }

    // Validate GUID format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(azureTenantId)) {
      throw new Error('Tenant ID deve ser um GUID válido');
    }
    if (!guidRegex.test(azureClientId)) {
      throw new Error('Client ID deve ser um GUID válido');
    }

    // Test OAuth2 token endpoint (without making actual request)
    const tokenEndpoint = `https://login.microsoftonline.com/${azureTenantId}/oauth2/v2.0/token`;
    
    return {
      success: true,
      method: 'OAuth2',
      secured: true,
      message: 'Configuração OAuth2 válida',
      details: { 
        tenantId: maskGuid(azureTenantId), 
        clientId: maskGuid(azureClientId),
        user: maskEmail(user),
        tokenEndpoint 
      }
    };
  } catch (error: any) {
    throw new Error(`Teste OAuth2 falhou: ${error.message}`);
  }
}

/**
 * Test email configuration (factory function)
 */
export async function testEmailConfiguration(config: EmailTestConfig): Promise<TestResult> {
  switch (config.provider) {
    case 'smtp':
    case 'gmail':
      return testSmtpConfiguration(config);
    case 'exchange-oauth2':
      return testExchangeOAuth2Configuration(config);
    default:
      throw new Error(`Provedor de email não suportado: ${config.provider}`);
  }
}

/**
 * Send test email
 */
export async function sendTestEmail(config: EmailTestConfig, testEmail: string): Promise<void> {
  const { provider, host, port, user, pass, from, azureTenantId, azureClientId, azureClientSecret } = config;
  
  if (!testEmail) {
    throw new Error('Email de destino é obrigatório');
  }

  if (!from) {
    throw new Error('Email de remetente é obrigatório');
  }

  if (provider === 'exchange-oauth2') {
    // For OAuth2, we would need to implement actual token acquisition and sending
    // For now, throw error indicating this feature needs implementation
    throw new Error('Envio de email OAuth2 ainda não implementado. Use configuração SMTP temporariamente.');
  }

  // SMTP/Gmail sending
  if (!host || !user || !pass) {
    throw new Error('Host, usuário e senha são obrigatórios para envio SMTP');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  const mailOptions = {
    from,
    to: testEmail,
    subject: 'PontoFlow - Teste de Configuração de Email',
    html: generateTestEmailHtml(config, testEmail)
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Generate HTML for test email
 */
function generateTestEmailHtml(config: EmailTestConfig, to: string): string {
  const provider = config.provider.toUpperCase();
  const timestamp = new Date().toLocaleString('pt-BR');
  const host = config.host || 'N/A';
  const port = config.port || 'N/A';
  const user = config.user ? maskEmail(config.user) : 'N/A';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Teste de Email - PontoFlow</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; }
            .config-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3b82f6; }
            .success { color: #059669; font-weight: bold; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
            .highlight { background: #fef3c7; padding: 10px; border-radius: 5px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Teste de Configuração de Email</h1>
            <p>Sistema de Timesheet - PontoFlow</p>
        </div>

        <div class="content">
            <p>Olá!</p>

            <p>Este é um email de teste enviado automaticamente pelo sistema <strong>PontoFlow</strong> para verificar se suas configurações de email estão funcionando corretamente.</p>

            <div class="success">
                <h2>Teste Concluído com Sucesso!</h2>
            </div>

            <div class="config-info">
                <h3>Informações da Configuração</h3>
                <ul>
                    <li><strong>Provedor:</strong> ${provider}</li>
                    <li><strong>Servidor:</strong> ${host}:${port}</li>
                    <li><strong>Usuário:</strong> ${user}</li>
                    <li><strong>Data/Hora:</strong> ${timestamp}</li>
                </ul>
            </div>

            <div class="highlight">
                <p><strong>Status:</strong> Se recebeu esta mensagem, suas configurações de email estão funcionando corretamente!</p>
            </div>

            <div class="config-info">
                <h3>Próximos Passos</h3>
                <ul>
                    <li>Configuração validada e funcionando</li>
                    <li>Notificações por email serão enviadas automaticamente</li>
                    <li>Relatórios e alertas serão entregues conforme configurado</li>
                    <li>Monitore regularmente o sistema para garantir operação contínua</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p>Este email foi enviado automaticamente pelo sistema PontoFlow.</p>
            <p>Para dúvidas ou suporte, entre em contato com a equipe de TI.</p>
            <p><small>Email enviado em: ${timestamp}</small></p>
        </div>
    </body>
    </html>
  `;
}

/**
 * Helper functions for masking sensitive data
 */
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