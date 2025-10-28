import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

export default async function ManagerPendingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requireRole(locale, ['ADMIN', 'MANAGER', 'MANAGER_TIMESHEET']);
  const supabase = await getServerSupabase();

  // Fetch pending timesheets directly from Supabase
  let items: Array<{ id: string; periodo_ini: string; periodo_fim: string; employee?: { id: string; display_name?: string | null } }> = [];

  if (user.role === 'ADMIN') {
    // Admin sees all pending timesheets in their tenant
    const { data } = await supabase
      .from('timesheets')
      .select('id,status,periodo_ini,periodo_fim,employee:employees!timesheets_employee_id_fkey(id,display_name)')
      .eq('tenant_id', user.tenant_id as string)
      .eq('status', 'enviado')
      .order('periodo_ini', { ascending: false });
    items = (data ?? []).map(item => ({
      ...item,
      employee: Array.isArray(item.employee) ? item.employee[0] : item.employee
    }));
  } else {
    // Manager sees only timesheets from their delegated groups
    // Nota: após migração phase-22, tenant_id estará disponível diretamente
    const { data: mgrGroups } = await supabase
      .from('manager_group_assignments')
      .select('group_id')
      .eq('manager_id', user.id)
      .eq('tenant_id', user.tenant_id as string);
    const groupIds = [...new Set((mgrGroups ?? []).map(g => g.group_id))];

    if (groupIds.length > 0) {
      // Get employees in those groups
      // Nota: após migração phase-22, tenant_id estará disponível diretamente
      const { data: memberships } = await supabase
        .from('employee_group_members')
        .select('employee_id')
        .in('group_id', groupIds)
        .eq('tenant_id', user.tenant_id as string);
      const employeeIds = [...new Set((memberships ?? []).map(m => m.employee_id))];

      if (employeeIds.length > 0) {
        const { data } = await supabase
          .from('timesheets')
          .select('id,status,periodo_ini,periodo_fim,employee:employees!timesheets_employee_id_fkey(id,display_name)')
          .eq('tenant_id', user.tenant_id as string)
          .eq('status', 'enviado')
          .in('employee_id', employeeIds)
          .order('periodo_ini', { ascending: false });
        items = (data ?? []).map(item => ({
          ...item,
          employee: Array.isArray(item.employee) ? item.employee[0] : item.employee
        }));
      }
    }
  }

  const t = await getTranslations({ locale, namespace: 'manager.pending' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">{t('title')}</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">{t('subtitle')}</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-[var(--muted-foreground)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">{t('noPending')}</h3>
          <p className="text-[var(--muted-foreground)]">{t('noPendingDescription')}</p>
        </div>
      ) : (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--muted)]/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{t('employee')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{t('period')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {items.map((ts) => (
                <tr key={ts.id} className="hover:bg-[var(--muted)]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
                        {(ts.employee?.display_name ?? 'U').charAt(0)}
                      </div>
                      <div className="text-[var(--foreground)]">{ts.employee?.display_name ?? ts.employee?.id ?? '\u2014'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[var(--foreground)]">
                    {ts.periodo_ini} \u2014 {ts.periodo_fim}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/${locale}/manager/timesheets/${ts.id}`} className="inline-flex items-center px-3 py-1.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90">
                      {t('review')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}