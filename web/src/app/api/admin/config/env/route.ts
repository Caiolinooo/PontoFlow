import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import fs from 'node:fs';
import path from 'node:path';

function upsertEnv(content: string, key: string, value: string) {
  const re = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  if (re.test(content)) return content.replace(re, line);
  return content.trimEnd() + `\n${line}\n`;
}

/**
 * Mask sensitive values for display
 */
function maskValue(value: string | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return '••••••••';
  return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
}

/**
 * GET endpoint to retrieve current configuration status
 */
export async function GET() {
  try {
    await requireApiRole(['ADMIN']);

    const config = {
      database: {
        provider: 'supabase',
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
        urlConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: maskValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        anonKeyConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceKey: maskValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
        serviceKeyConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      email: {
        provider: process.env.EMAIL_PROVIDER || 'smtp',
        smtp: {
          host: process.env.SMTP_HOST || null,
          hostConfigured: !!process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || '587',
          portConfigured: !!process.env.SMTP_PORT,
          user: process.env.SMTP_USER || null,
          userConfigured: !!process.env.SMTP_USER,
          pass: maskValue(process.env.SMTP_PASS),
          passConfigured: !!process.env.SMTP_PASS,
          from: process.env.MAIL_FROM || null,
          fromConfigured: !!process.env.MAIL_FROM,
        },
        oauth2: {
          tenantId: maskValue(process.env.AZURE_TENANT_ID),
          tenantIdConfigured: !!process.env.AZURE_TENANT_ID,
          clientId: maskValue(process.env.AZURE_CLIENT_ID),
          clientIdConfigured: !!process.env.AZURE_CLIENT_ID,
          clientSecret: maskValue(process.env.AZURE_CLIENT_SECRET),
          clientSecretConfigured: !!process.env.AZURE_CLIENT_SECRET,
        }
      },
      sync: {
        secret: maskValue(process.env.ADMIN_SYNC_SECRET),
        secretConfigured: !!process.env.ADMIN_SYNC_SECRET,
        sourceUrl: process.env.SOURCE_SYSTEM_SYNC_URL || null,
        sourceUrlConfigured: !!process.env.SOURCE_SYSTEM_SYNC_URL,
        targetUrl: process.env.TARGET_SYSTEM_SYNC_URL || null,
        targetUrlConfigured: !!process.env.TARGET_SYSTEM_SYNC_URL,
      },
      endpoints: {
        apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || null,
        apiBaseUrlConfigured: !!process.env.NEXT_PUBLIC_API_BASE_URL,
        webhookUrl: process.env.WEBHOOK_URL || null,
        webhookUrlConfigured: !!process.env.WEBHOOK_URL,
      }
    };

    return NextResponse.json({ config });
  } catch (e: any) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({
      error: e?.message || 'internal_error',
      details: e?.stack
    }, { status: 500 });
  }
}

/**
 * Validates environment variable key to prevent injection
 * Only allows alphanumeric characters and underscores
 */
function validateEnvKey(key: string): boolean {
  return /^[A-Z_][A-Z0-9_]*$/.test(key);
}

/**
 * Validates environment variable value to prevent malicious content
 * Blocks: newlines, null bytes, and potentially dangerous characters
 */
function validateEnvValue(value: string): boolean {
  // Block null bytes, newlines that could break .env format
  if (/[\0\r\n]/.test(value)) {
    return false;
  }
  // Value length limit to prevent DoS
  if (value.length > 10000) {
    return false;
  }
  return true;
}

export async function PUT(req: NextRequest) {
  try {
    await requireApiRole(['ADMIN']);

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        error: 'config_write_disabled_in_production',
        message: 'Em produção, configure as variáveis de ambiente no provedor (Vercel, Render, etc.)'
      }, { status: 405 });
    }

    const body = await req.json().catch(() => ({}));

    // SECURITY: Validate all keys and values before writing
    const invalidKeys: string[] = [];
    const invalidValues: string[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (!validateEnvKey(key)) {
        invalidKeys.push(key);
      }
      if (typeof value === 'string' && !validateEnvValue(value)) {
        invalidValues.push(key);
      }
    }

    if (invalidKeys.length > 0 || invalidValues.length > 0) {
      return NextResponse.json({
        error: 'invalid_environment_variables',
        message: 'Variáveis de ambiente inválidas detectadas',
        invalidKeys: invalidKeys.length > 0 ? invalidKeys : undefined,
        invalidValues: invalidValues.length > 0 ? invalidValues : undefined
      }, { status: 400 });
    }

    const envPath = path.join(process.cwd(), '.env.local');
    let content = '';

    try {
      content = fs.readFileSync(envPath, 'utf8');
    } catch {
      content = '# Environment Variables\n# Generated by PontoFlow Admin Panel\n\n';
    }

    // Update all provided keys
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string' && value.trim()) {
        content = upsertEnv(content, key, value);
      }
    }

    fs.writeFileSync(envPath, content, 'utf8');

    return NextResponse.json({
      ok: true,
      message: 'Configurações salvas em .env.local. Reinicie o servidor para aplicar.',
      updated: Object.keys(body).length
    });
  } catch (e: any) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    // SECURITY: Never expose stack traces in production
    return NextResponse.json({
      error: e?.message || 'internal_error'
    }, { status: 500 });
  }
}

export const POST = PUT;

