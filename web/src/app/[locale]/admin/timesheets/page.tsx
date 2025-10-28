import { requireRole } from '@/lib/auth/server';
import Link from 'next/link';
import { getServiceSupabase } from '@/lib/supabase/service';
import { getTranslations } from 'next-intl/server';

export default async function AdminTimesheetsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    tenant?: string;
    period?: string;
  }>
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin.timesheets' });
  const { q, status, tenant, period } = await searchParams;
  await requireRole(locale, ['ADMIN']);

  const query = (q ?? '').trim();
  const supabase = getServiceSupabase();

  // Fetch tenants for filter
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name')
    .order('name');

  // First, get employee IDs if searching by name
  let employeeIds: string[] | null = null;
  if (query) {
    const { data: employees } = await supabase
      .from('employees')
      .select('id')
      .ilike('display_name', `%${query}%`);

    if (employees && employees.length > 0) {
      employeeIds = employees.map(e => e.id);
    } else {
      // No employees found, return empty result
      employeeIds = [];
    }
  }

  // Build timesheet query with filters - simple query without complex joins
  let timesheetQuery = supabase
    .from('timesheets')
    .select('id, employee_id, periodo_ini, periodo_fim, status, created_at, tenant_id')
    .order('created_at', { ascending: false })
    .limit(100);

  // Apply filters
  if (tenant) {
    timesheetQuery = timesheetQuery.eq('tenant_id', tenant);
  }

  if (status) {
    timesheetQuery = timesheetQuery.eq('status', status);
  }

  if (period) {
    timesheetQuery = timesheetQuery.gte('periodo_ini', `${period}-01`);
    timesheetQuery = timesheetQuery.lt('periodo_ini', `${period}-32`);
  }

  if (employeeIds !== null) {
    if (employeeIds.length === 0) {
      // No employees found, return empty
      timesheetQuery = timesheetQuery.eq('id', '00000000-0000-0000-0000-000000000000');
    } else {
      timesheetQuery = timesheetQuery.in('employee_id', employeeIds);
    }
  }

  const { data: rawTimesheets, error: timesheetError } = await timesheetQuery;

  if (timesheetError) {
    console.error('Error fetching timesheets:', JSON.stringify(timesheetError, null, 2));
  }

  // Fetch related data for each timesheet
  const timesheets = await Promise.all((rawTimesheets || []).map(async (ts: any) => {
    // Fetch employee data with profile join (using explicit FK name)
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, cargo, profile_id, profiles!employees_profile_id_fkey(display_name)')
      .eq('id', ts.employee_id)
      .maybeSingle();

    if (empError) {
      console.error('Error fetching employee:', ts.employee_id, empError);
    }

    if (!employee) {
      console.warn('Employee not found for timesheet:', ts.id, 'employee_id:', ts.employee_id);
    }

    // Fetch tenant data
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', ts.tenant_id)
      .maybeSingle();

    // Transform employee data to include display_name at root level
    const employeeData = employee ? {
      id: employee.id,
      cargo: employee.cargo,
      display_name: (employee.profiles as any)?.display_name || null
    } : null;

    return {
      ...ts,
      employee: employeeData,
      tenant
    };
  }));

  const statusLabels: Record<string, string> = {
    rascunho: t('statusDraft'),
    enviado: t('statusSubmitted'),
    aprovado: t('statusApproved'),
    recusado: t('statusRejected'),
    bloqueado: 'Bloqueado'
  };

  const statusColors: Record<string, string> = {
    rascunho: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    enviado: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    aprovado: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    recusado: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    bloqueado: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">{t('title')}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <form method="get" className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Employee Search */}
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
              {t('employee')}
            </label>
            <input
              name="q"
              placeholder={t('searchPlaceholder')}
              defaultValue={query}
              className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded text-sm"
            />
          </div>

          {/* Tenant Filter */}
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
              {t('tenant')}
            </label>
            <select
              name="tenant"
              defaultValue={tenant || ''}
              className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded text-sm"
            >
              <option value="">{t('allTenants')}</option>
              {tenants?.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
              {t('status')}
            </label>
            <select
              name="status"
              defaultValue={status || ''}
              className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded text-sm"
            >
              <option value="">{t('allStatuses')}</option>
              <option value="rascunho">{t('statusDraft')}</option>
              <option value="enviado">{t('statusSubmitted')}</option>
              <option value="aprovado">{t('statusApproved')}</option>
              <option value="recusado">{t('statusRejected')}</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </div>

          {/* Period Filter */}
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
              {t('period')}
            </label>
            <input
              name="period"
              type="month"
              defaultValue={period || ''}
              className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded text-sm font-medium hover:opacity-90"
          >
            {t('filter')}
          </button>
          <Link
            href={`/${locale}/admin/timesheets`}
            className="px-4 py-2 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded text-sm font-medium hover:opacity-90"
          >
            {t('clear')}
          </Link>
        </div>
      </form>

      {/* Results */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">
            {t('results')} ({timesheets?.length || 0})
          </h2>
        </div>

        {timesheets && timesheets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
                <tr>
                  <th className="text-left px-6 py-3">{t('employee')}</th>
                  <th className="text-left px-6 py-3">{t('role')}</th>
                  <th className="text-left px-6 py-3">{t('tenant')}</th>
                  <th className="text-left px-6 py-3">{t('periodColumn')}</th>
                  <th className="text-left px-6 py-3">{t('status')}</th>
                  <th className="text-right px-6 py-3">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {timesheets.map((ts: any) => (
                  <tr key={ts.id} className="border-t border-[var(--border)] hover:bg-[var(--muted)]/20">
                    <td className="px-6 py-3 text-[var(--foreground)]">
                      {ts.employee?.display_name || 'N/A'}
                    </td>
                    <td className="px-6 py-3 text-[var(--muted-foreground)]">
                      {ts.employee?.cargo || '-'}
                    </td>
                    <td className="px-6 py-3 text-[var(--muted-foreground)]">
                      {ts.tenant?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-3 text-[var(--foreground)]">
                      {new Date(ts.periodo_ini).toLocaleDateString(locale)} - {new Date(ts.periodo_fim).toLocaleDateString(locale)}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[ts.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[ts.status] || ts.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/${locale}/admin/timesheets/view/${ts.id}`}
                        className="inline-flex px-3 py-1 rounded bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium hover:opacity-90"
                      >
                        {t('viewDetails')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-[var(--muted-foreground)]">
            <p>{t('noTimesheetsFound')}</p>
            <p className="text-sm mt-1">{t('adjustFilters')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

