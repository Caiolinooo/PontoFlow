import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { encryptSmtpPassword } from '@/lib/email/smtp-encryption';

/**
 * GET /api/admin/email/config
 * Fetch complete email configuration for the current tenant
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);
    const supabase = getServiceSupabase();

    // Get current tenant from user
    const tenantId = user.tenant_id;
    
    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_required' }, { status: 400 });
    }

    // Fetch tenant with email settings
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, settings')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      console.error('[email-config] Tenant not found:', error);
      return NextResponse.json({ error: 'tenant_not_found' }, { status: 404 });
    }

    // Extract email configuration
    let emailConfig = tenant.settings?.email || {};

    // MIGRATION/FALLBACK: If no email config, try to load from legacy smtp settings
    if (!emailConfig.provider && tenant.settings?.smtp) {
      console.log('[email-config] Migrating from legacy SMTP settings');
      const legacySmtp = tenant.settings.smtp;

      // Convert legacy SMTP to new email format
      if (legacySmtp.enabled) {
        emailConfig = {
          provider: 'smtp',
          smtp: {
            host: legacySmtp.host || '',
            port: legacySmtp.port || 587,
            user: legacySmtp.user || '',
            password_encrypted: legacySmtp.password_encrypted || '',
            from: legacySmtp.from || '',
            from_name: legacySmtp.from_name || '',
            secure: true,
          },
        };
      }
    }

    // Return email configuration (without encrypted passwords)
    return NextResponse.json({
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      email: {
        provider: emailConfig.provider || 'smtp',
        smtp: emailConfig.smtp ? {
          host: emailConfig.smtp.host || '',
          port: emailConfig.smtp.port || 587,
          user: emailConfig.smtp.user || '',
          from: emailConfig.smtp.from || '',
          from_name: emailConfig.smtp.from_name || '',
          secure: emailConfig.smtp.secure ?? true,
          has_password: !!emailConfig.smtp.password_encrypted,
        } : null,
        oauth2: emailConfig.oauth2 ? {
          tenant_id: emailConfig.oauth2.tenant_id || '',
          client_id: emailConfig.oauth2.client_id || '',
          user: emailConfig.oauth2.user || '',
          has_secret: !!emailConfig.oauth2.client_secret_encrypted,
        } : null,
        sendgrid: emailConfig.sendgrid ? {
          from: emailConfig.sendgrid.from || '',
          from_name: emailConfig.sendgrid.from_name || '',
          has_api_key: !!emailConfig.sendgrid.api_key_encrypted,
        } : null,
        ses: emailConfig.ses ? {
          region: emailConfig.ses.region || 'us-east-1',
          access_key_id: emailConfig.ses.access_key_id || '',
          from: emailConfig.ses.from || '',
          from_name: emailConfig.ses.from_name || '',
          has_secret: !!emailConfig.ses.secret_access_key_encrypted,
        } : null,
        deliverability: emailConfig.deliverability || {
          spf_record: '',
          dkim_selector: '',
          dkim_domain: '',
          dkim_public_key: '',
          dmarc_policy: '',
          return_path: '',
        },
      },
    });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    console.error('[email-config] GET error:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/email/config
 * Save complete email configuration for the current tenant
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);
    const supabase = getServiceSupabase();
    const body = await req.json().catch(() => ({}));

    // Get current tenant from user
    const tenantId = user.tenant_id;
    
    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_required' }, { status: 400 });
    }

    // Fetch current tenant settings
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('id, settings')
      .eq('id', tenantId)
      .single();

    if (fetchError || !tenant) {
      console.error('[email-config] Tenant not found:', fetchError);
      return NextResponse.json({ error: 'tenant_not_found' }, { status: 404 });
    }

    // Build email configuration
    const emailConfig: any = {
      provider: body.provider || 'smtp',
    };

    // Handle SMTP configuration
    if (body.smtp) {
      emailConfig.smtp = {
        host: body.smtp.host || '',
        port: Number(body.smtp.port) || 587,
        user: body.smtp.user || '',
        from: body.smtp.from || '',
        from_name: body.smtp.from_name || '',
        secure: body.smtp.secure ?? true,
      };

      // Encrypt password if provided
      if (body.smtp.password) {
        try {
          emailConfig.smtp.password_encrypted = encryptSmtpPassword(body.smtp.password);
        } catch (encryptError) {
          console.error('[email-config] Encryption error:', encryptError);
          return NextResponse.json({ error: 'encryption_failed' }, { status: 500 });
        }
      } else {
        // Keep existing password if not provided
        emailConfig.smtp.password_encrypted = tenant.settings?.email?.smtp?.password_encrypted;
      }
    }

    // Handle OAuth2 configuration
    if (body.oauth2) {
      emailConfig.oauth2 = {
        tenant_id: body.oauth2.tenant_id || '',
        client_id: body.oauth2.client_id || '',
        user: body.oauth2.user || '',
      };

      // Encrypt client secret if provided
      if (body.oauth2.client_secret) {
        try {
          emailConfig.oauth2.client_secret_encrypted = encryptSmtpPassword(body.oauth2.client_secret);
        } catch (encryptError) {
          console.error('[email-config] Encryption error:', encryptError);
          return NextResponse.json({ error: 'encryption_failed' }, { status: 500 });
        }
      } else {
        // Keep existing secret if not provided
        emailConfig.oauth2.client_secret_encrypted = tenant.settings?.email?.oauth2?.client_secret_encrypted;
      }
    }

    // Handle SendGrid configuration
    if (body.sendgrid) {
      emailConfig.sendgrid = {
        from: body.sendgrid.from || '',
        from_name: body.sendgrid.from_name || '',
      };

      // Encrypt API key if provided
      if (body.sendgrid.api_key) {
        try {
          emailConfig.sendgrid.api_key_encrypted = encryptSmtpPassword(body.sendgrid.api_key);
        } catch (encryptError) {
          console.error('[email-config] Encryption error:', encryptError);
          return NextResponse.json({ error: 'encryption_failed' }, { status: 500 });
        }
      } else {
        // Keep existing API key if not provided
        emailConfig.sendgrid.api_key_encrypted = tenant.settings?.email?.sendgrid?.api_key_encrypted;
      }
    }

    // Handle SES configuration
    if (body.ses) {
      emailConfig.ses = {
        region: body.ses.region || 'us-east-1',
        access_key_id: body.ses.access_key_id || '',
        from: body.ses.from || '',
        from_name: body.ses.from_name || '',
      };

      // Encrypt secret access key if provided
      if (body.ses.secret_access_key) {
        try {
          emailConfig.ses.secret_access_key_encrypted = encryptSmtpPassword(body.ses.secret_access_key);
        } catch (encryptError) {
          console.error('[email-config] Encryption error:', encryptError);
          return NextResponse.json({ error: 'encryption_failed' }, { status: 500 });
        }
      } else {
        // Keep existing secret if not provided
        emailConfig.ses.secret_access_key_encrypted = tenant.settings?.email?.ses?.secret_access_key_encrypted;
      }
    }

    // Handle deliverability configuration
    if (body.deliverability) {
      emailConfig.deliverability = {
        spf_record: body.deliverability.spf_record || '',
        dkim_selector: body.deliverability.dkim_selector || '',
        dkim_domain: body.deliverability.dkim_domain || '',
        dkim_public_key: body.deliverability.dkim_public_key || '',
        dmarc_policy: body.deliverability.dmarc_policy || '',
        return_path: body.deliverability.return_path || '',
      };

      // Encrypt DKIM private key if provided
      if (body.deliverability.dkim_private_key) {
        try {
          emailConfig.deliverability.dkim_private_key_encrypted = encryptSmtpPassword(body.deliverability.dkim_private_key);
        } catch (encryptError) {
          console.error('[email-config] Encryption error:', encryptError);
          return NextResponse.json({ error: 'encryption_failed' }, { status: 500 });
        }
      } else {
        // Keep existing DKIM private key if not provided
        emailConfig.deliverability.dkim_private_key_encrypted = tenant.settings?.email?.deliverability?.dkim_private_key_encrypted;
      }
    }

    // Update tenant settings
    const updatedSettings = {
      ...tenant.settings,
      email: emailConfig,
    };

    const { error: updateError } = await supabase
      .from('tenants')
      .update({ settings: updatedSettings })
      .eq('id', tenantId);

    if (updateError) {
      console.error('[email-config] Update error:', updateError);
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }

    console.log('[email-config] Email configuration updated for tenant:', tenantId);
    return NextResponse.json({ ok: true, tenant_id: tenantId });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    console.error('[email-config] POST error:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

