import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { encryptSmtpPassword, decryptSmtpPassword, maskPassword } from '@/lib/email/smtp-encryption';

// GET - Fetch SMTP configuration for a tenant
export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN', 'TENANT_ADMIN']);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    // Check if user has access to this tenant
    if (user.role !== 'ADMIN') {
      const hasAccess = user.tenant_roles?.some(tr => tr.tenant_id === tenantId && tr.role === 'TENANT_ADMIN');
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to this tenant' }, { status: 403 });
      }
    }

    const supabase = getServiceSupabase();
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const smtpSettings = tenant.settings?.smtp;

    // Don't return the encrypted password
    if (smtpSettings && smtpSettings.password_encrypted) {
      return NextResponse.json({
        smtp: {
          ...smtpSettings,
          password_encrypted: undefined,
          password_masked: maskPassword(smtpSettings.password_encrypted),
        },
      });
    }

    return NextResponse.json({ smtp: smtpSettings || null });
  } catch (error: any) {
    console.error('[smtp-config] GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST - Save SMTP configuration for a tenant
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN', 'TENANT_ADMIN']);
    const body = await request.json();
    const { tenantId, smtp } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    // Check if user has access to this tenant
    if (user.role !== 'ADMIN') {
      const hasAccess = user.tenant_roles?.some(tr => tr.tenant_id === tenantId && tr.role === 'TENANT_ADMIN');
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to this tenant' }, { status: 403 });
      }
    }

    // Validate SMTP configuration
    if (smtp.enabled) {
      if (!smtp.host || !smtp.port || !smtp.user || !smtp.from) {
        return NextResponse.json(
          { error: 'Missing required SMTP fields: host, port, user, from' },
          { status: 400 }
        );
      }

      // Validate port
      const port = Number(smtp.port);
      if (isNaN(port) || port < 1 || port > 65535) {
        return NextResponse.json({ error: 'Invalid port number' }, { status: 400 });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(smtp.user) || !emailRegex.test(smtp.from)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
    }

    const supabase = getServiceSupabase();

    // Get current settings
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single();

    if (fetchError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Prepare SMTP settings
    let smtpSettings: any = {
      enabled: smtp.enabled,
    };

    if (smtp.enabled) {
      // Encrypt password if provided
      let encryptedPassword: string;
      if (smtp.password) {
        try {
          encryptedPassword = encryptSmtpPassword(smtp.password);
        } catch (encryptError) {
          console.error('[smtp-config] Encryption error:', encryptError);
          return NextResponse.json({ error: 'Failed to encrypt password' }, { status: 500 });
        }
      } else {
        // Keep existing password if not provided
        encryptedPassword = tenant.settings?.smtp?.password_encrypted;
        if (!encryptedPassword) {
          return NextResponse.json({ error: 'Password is required' }, { status: 400 });
        }
      }

      smtpSettings = {
        enabled: true,
        host: smtp.host,
        port: Number(smtp.port),
        user: smtp.user,
        password_encrypted: encryptedPassword,
        from: smtp.from,
        from_name: smtp.from_name || '',
      };
    }

    // Update tenant settings
    const updatedSettings = {
      ...tenant.settings,
      smtp: smtpSettings,
    };

    const { error: updateError } = await supabase
      .from('tenants')
      .update({ settings: updatedSettings })
      .eq('id', tenantId);

    if (updateError) {
      console.error('[smtp-config] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update SMTP configuration' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'SMTP configuration saved successfully' });
  } catch (error: any) {
    console.error('[smtp-config] POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

