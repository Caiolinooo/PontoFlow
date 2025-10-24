import { requireRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import AdminSettingsTabs from '@/components/admin/AdminSettingsTabs';

export default async function AdminSettingsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  await requireRole(locale, ['ADMIN']);

  const supabase = await getServerSupabase();

  // Fetch tenant and settings
  const { data: tenant } = await supabase.from('tenants').select('*').maybeSingle();
  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('*')
    .maybeSingle();

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Configurações do Sistema</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Configure variáveis de ambiente, integrações, sincronização e preferências da empresa
          </p>
        </div>
        <a
          href={`/${locale}/admin/settings/notifications-test`}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Testar Notificações
        </a>
      </div>

      {/* Tabbed Settings Interface */}
      <AdminSettingsTabs locale={locale} tenant={tenant} settings={settings} />
    </div>
  );
}

