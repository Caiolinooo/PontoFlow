import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

export default async function TimesheetsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requireAuth(locale);

  const supabase = await getServerSupabase();
  // Resolve employee record for current user
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('tenant_id', user.tenant_id as string)
    .eq('profile_id', user.id)
    .maybeSingle();

  const t = await getTranslations('employee.timesheets');

  // If the profile is not linked to an employee, avoid invalid UUID filters
  if (!emp) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">{t('title')}</h1>
            <p className="mt-2 text-[var(--muted-foreground)]">{t('subtitle')}</p>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 flex items-center justify-between">
          <div className="pr-4">
            <p className="text-[var(--destructive)] mb-1">{t('errors.employeeNotConfigured')}</p>
            <p className="text-[var(--muted-foreground)] text-sm">Clique abaixo para criar seu cadastro de colaborador neste tenant.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/employee/bootstrap`}
              className="inline-flex items-center px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90 transition-colors font-semibold"
            >
              Criar meu cadastro
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Get user's timesheets (only when employee exists)
  const { data: timesheets, error } = await supabase
    .from('timesheets')
    .select('id, periodo_ini, periodo_fim, status')
    .eq('employee_id', emp.id)
    .order('periodo_ini', { ascending: false });

  // Status badge colors (supports pt/en variants)
  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'draft':
      case 'rascunho':
        return 'bg-slate-500/15 text-slate-500';
      case 'submitted':
      case 'enviado':
        return 'bg-blue-500/15 text-blue-500';
      case 'approved':
      case 'aprovado':
        return 'bg-emerald-500/15 text-emerald-500';
      case 'rejected':
      case 'rejeitado':
        return 'bg-red-500/15 text-red-500';
      default:
        return 'bg-slate-500/15 text-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">{t('title')}</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/employee/timesheets/new`}
            className="inline-flex items-center px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90 transition-colors font-semibold"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('newTimesheet')}
          </Link>
          <Link
            href={`/${locale}/employee/timesheets/current`}
            className="inline-flex items-center px-4 py-2 bg-[var(--muted)] text-[var(--foreground)] rounded-lg hover:opacity-90 transition-colors font-semibold border border-[var(--border)]"
          >
            Abrir mês atual
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
          <p className="text-[var(--destructive)]">{t('errorLoading')}</p>
        </div>
      )}

      {/* Empty */}
      {!timesheets || timesheets.length === 0 ? (
        <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-[var(--muted-foreground)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-[var(--card-foreground)] mb-2">{t('noTimesheets')}</h3>
          <p className="text-[var(--muted-foreground)] mb-6">{t('noTimesheetsDescription')}</p>
          <Link
            href={`/${locale}/employee/timesheets/new`}
            className="inline-flex items-center px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90 transition-colors font-semibold"
          >
            {t('createFirst')}
          </Link>
        </div>
      ) : (
        <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                  {/* Use manager period label for now */}
                  {t('table.date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                  {t('table.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                  {t('table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-[var(--card)] divide-y divide-[var(--border)]">
              {timesheets.map((s) => (
                <tr key={s.id} className="hover:bg-[var(--muted)]/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--card-foreground)]">
                    {new Date(s.periodo_ini).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                    <div className="text-xs text-[var(--muted-foreground)]">{s.periodo_ini}  {s.periodo_fim}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(s.status)}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/${locale}/employee/timesheets/${s.id}`} className="text-[var(--primary)] hover:opacity-90 transition-colors">
                      {t('table.view')}
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
