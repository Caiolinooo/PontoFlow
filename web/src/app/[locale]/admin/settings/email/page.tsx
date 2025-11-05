import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import TenantSmtpSettings from '@/components/admin/TenantSmtpSettings';

interface Props {
  params: Promise<{
    locale: string;
  }>;
}

export default async function AdminEmailSettingsPage({ params }: Props) {
  const { locale } = await params;
  const user = await requireRole(locale, ['ADMIN', 'MANAGER']);

  // Get user's accessible tenants
  const supabase = getServiceSupabase();
  
  let tenants: Array<{ id: string; name: string }> = [];

  if (user.role === 'ADMIN') {
    // ADMIN can see all tenants
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error fetching tenants:', error);
    } else {
      tenants = data || [];
    }
  } else if (user.tenant_roles) {
    // Check if user has TENANT_ADMIN role in any tenant
    const tenantIds = user.tenant_roles
      ?.filter(tr => tr.role === 'TENANT_ADMIN')
      .map(tr => tr.tenant_id) || [];

    if (tenantIds.length > 0) {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name')
        .in('id', tenantIds)
        .order('name');

      if (error) {
        console.error('Error fetching tenants:', error);
      } else {
        tenants = data || [];
      }
    }
  }

  if (tenants.length === 0) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Email Settings</h1>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200">
              No tenants available. Please contact your administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // For now, show the first tenant's settings
  // In the future, we can add a tenant selector dropdown
  const selectedTenant = tenants[0];

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Email Settings</h1>
          <p className="text-[var(--muted-foreground)]">
            Configure SMTP settings for sending emails from your tenant
          </p>
        </div>

        {tenants.length > 1 && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              You have access to {tenants.length} tenants. Currently showing settings for <strong>{selectedTenant.name}</strong>.
            </p>
          </div>
        )}

        <TenantSmtpSettings
          tenantId={selectedTenant.id}
          tenantName={selectedTenant.name}
        />

        <div className="mt-8 p-6 bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <h3 className="text-lg font-semibold mb-3">About SMTP Configuration</h3>
          <div className="space-y-3 text-sm text-[var(--muted-foreground)]">
            <p>
              <strong>Custom SMTP:</strong> Configure your own email server to send emails from your domain.
              This gives you full control over email delivery and branding.
            </p>
            <p>
              <strong>Security:</strong> All SMTP passwords are encrypted before being stored in the database.
              We use AES-256-GCM encryption to protect your credentials.
            </p>
            <p>
              <strong>Fallback:</strong> If custom SMTP is not configured or disabled, the system will use
              the default SMTP configuration from environment variables.
            </p>
            <p>
              <strong>Common SMTP Providers:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Office 365: smtp.office365.com:587</li>
              <li>Gmail: smtp.gmail.com:587 (requires app password)</li>
              <li>SendGrid: smtp.sendgrid.net:587</li>
              <li>Mailgun: smtp.mailgun.org:587</li>
              <li>Amazon SES: email-smtp.region.amazonaws.com:587</li>
            </ul>
            <p>
              <strong>Testing:</strong> Always test your SMTP configuration after saving to ensure
              emails are being delivered correctly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

