import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { sendEmail } from '@/lib/notifications/email-service';
import { getServiceSupabase } from '@/lib/supabase/service';

// POST - Send a test email using tenant's SMTP configuration
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN', 'TENANT_ADMIN']);
    const body = await request.json();
    const { tenantId, testEmail } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    if (!testEmail) {
      return NextResponse.json({ error: 'Test email address is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check if user has access to this tenant
    if (user.role !== 'ADMIN') {
      const hasAccess = user.tenant_roles?.some(tr => tr.tenant_id === tenantId && tr.role === 'TENANT_ADMIN');
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to this tenant' }, { status: 403 });
      }
    }

    // Get tenant name for the email
    const supabase = getServiceSupabase();
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, settings')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check if tenant has SMTP configured
    const smtpSettings = tenant.settings?.smtp;
    if (!smtpSettings || !smtpSettings.enabled) {
      return NextResponse.json(
        { error: 'SMTP is not configured or enabled for this tenant' },
        { status: 400 }
      );
    }

    // Generate test email HTML
    const testEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SMTP Test Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px;">
                      <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
                        SMTP Test Email
                      </h1>
                      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #4a4a4a;">
                        This is a test email from <strong>${tenant.name}</strong> to verify your SMTP configuration.
                      </p>
                      <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; font-size: 14px; color: #0c4a6e;">
                          <strong>Success!</strong> If you're reading this email, your SMTP configuration is working correctly.
                        </p>
                      </div>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border-top: 1px solid #e5e5e5; padding-top: 20px;">
                        <tr>
                          <td style="padding: 8px 0;">
                            <strong style="color: #1a1a1a;">Tenant:</strong>
                            <span style="color: #4a4a4a;">${tenant.name}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <strong style="color: #1a1a1a;">SMTP Host:</strong>
                            <span style="color: #4a4a4a;">${smtpSettings.host}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <strong style="color: #1a1a1a;">SMTP Port:</strong>
                            <span style="color: #4a4a4a;">${smtpSettings.port}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <strong style="color: #1a1a1a;">From Address:</strong>
                            <span style="color: #4a4a4a;">${smtpSettings.from}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <strong style="color: #1a1a1a;">Test Time:</strong>
                            <span style="color: #4a4a4a;">${new Date().toLocaleString()}</span>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                        This is an automated test email from PontoFlow Timesheet Manager.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Send test email
    try {
      await sendEmail({
        to: testEmail,
        subject: `SMTP Test - ${tenant.name}`,
        html: testEmailHtml,
        tenantId: tenantId,
      });

      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
      });
    } catch (emailError: any) {
      console.error('[smtp-test] Email send error:', emailError);
      return NextResponse.json(
        {
          error: 'Failed to send test email',
          details: emailError.message || 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[smtp-test] POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

