import { requireRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';
import AdminSettingsTabs from '@/components/admin/AdminSettingsTabs';

export default async function AdminSettingsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const user = await requireRole(locale, ['ADMIN']);

  const t = await getTranslations({ locale, namespace: 'adminSettings' });

  const supabase = await getServerSupabase();

  console.log('[ADMIN SETTINGS] User tenant_id:', user.tenant_id);

  // Fetch tenant and settings with graceful fallbacks
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, timezone, work_schedule, work_mode, settings, deadline_day')
    .eq('id', user.tenant_id)
    .maybeSingle();

  console.log('[ADMIN SETTINGS] Tenant:', tenant);

  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle();

  console.log('[ADMIN SETTINGS] Settings:', settings);

  // Merge tenant settings with graceful fallbacks for missing columns
  const mergedSettings = {
    ...settings,
    timezone: tenant?.timezone || settings?.timezone || 'America/Sao_Paulo',
    work_mode: tenant?.work_mode || settings?.work_mode || 'padrao',
    deadline_day: tenant?.deadline_day || settings?.deadline_day || 16,
  };

  console.log('[ADMIN SETTINGS] Merged settings:', mergedSettings);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">{t('title')}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {t('subtitle')}
          </p>
        </div>
        <a
          href={`/${locale}/admin/settings/notifications-test`}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {t('testNotifications')}
        </a>
      </div>

      {/* Tabbed Settings Interface */}
      <AdminSettingsTabs locale={locale} tenant={tenant} settings={mergedSettings} />
    </div>
  );
}

