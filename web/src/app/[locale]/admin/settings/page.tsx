import { requireRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';
import AdminSettingsTabs from '@/components/admin/AdminSettingsTabs';

export default async function AdminSettingsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  await requireRole(locale, ['ADMIN']);

  const t = await getTranslations({ locale, namespace: 'adminSettings' });

  const supabase = await getServerSupabase();

  // Fetch tenant and settings
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, work_schedule, work_mode, settings')
    .eq('id', (await supabase.auth.getUser()).data.user?.user_metadata?.tenant_id)
    .maybeSingle();

  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('*')
    .eq('tenant_id', tenant?.id)
    .maybeSingle();

  // Merge tenant work_mode into settings for easier access in component
  const mergedSettings = {
    ...settings,
    work_mode: tenant?.work_mode || 'standard',
  };

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

