import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/server';
import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import InvitationRowActions from '@/components/admin/InvitationRowActions';

export default async function InvitationsPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ locale: string }>; 
  searchParams?: Promise<Record<string, string | string[] | undefined>>; 
}) {
  const { locale } = await params;
  const sp = (await (searchParams ?? Promise.resolve({}))) || {};
  const get = (k: string) => {
    const v = (sp as any)[k];
    return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
  };
  
  const status = get('status').toString().trim() || 'pending';
  const page = Math.max(parseInt((get('page') || '1') as string, 10) || 1, 1);
  const pageSize = 20;
  
  await requireRole(locale, ['ADMIN']);

  const supabase = await getServerSupabase();
  
  let query = supabase
    .from('user_invitations')
    .select('*, invited_by_user:users_unified!invited_by(first_name, last_name)', { count: 'exact' });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  query = query
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data: invitations, count } = await query;

  const t = await getTranslations({ locale, namespace: 'admin.users' });
  const tInvitations = await getTranslations({ locale, namespace: 'invitations' });

  const statusColors: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/admin/users`}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">📬 {tInvitations('title')}</h1>
          </div>
          <p className="mt-2 text-[var(--muted-foreground)]">
            {tInvitations('form.subtitle')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <form method="get" className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex flex-wrap gap-3">
        <select
          name="status"
          defaultValue={status}
          className="border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded-lg px-3 py-2"
        >
          <option value="all">{tInvitations('list.filter.all')}</option>
          <option value="pending">{tInvitations('list.filter.pending')}</option>
          <option value="accepted">{tInvitations('list.filter.accepted')}</option>
          <option value="expired">{tInvitations('list.filter.expired')}</option>
          <option value="cancelled">{tInvitations('list.filter.cancelled')}</option>
        </select>
        <button className="px-4 py-2 bg-[var(--muted)] text-[var(--foreground)] rounded-lg hover:bg-[var(--muted)]/80 transition-colors">
          {t('filter')}
        </button>
      </form>

      {/* Invitations Table */}
      {!invitations || invitations.length === 0 ? (
        <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-[var(--muted-foreground)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
          </svg>
          <h3 className="text-lg font-medium text-[var(--card-foreground)] mb-2">
            {tInvitations('list.empty')}
          </h3>
          <p className="text-[var(--muted-foreground)]">
            {t('noUsersDescription')}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--muted)]/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                  {tInvitations('list.table.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                  {tInvitations('list.table.email')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                  {tInvitations('list.table.role')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                  {tInvitations('list.table.invitedBy')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                  {tInvitations('list.table.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                  {tInvitations('list.table.expiresAt')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-[var(--card)] divide-y divide-[var(--border)]">
              {invitations.map((invitation: any) => (
                <tr key={invitation.id} className="hover:bg-[var(--muted)]/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[var(--card-foreground)]">
                      {invitation.first_name} {invitation.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--card-foreground)]">{invitation.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
                      {tInvitations(`form.roles.${invitation.role}` as any)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--card-foreground)]">
                    {invitation.invited_by_user
                      ? `${invitation.invited_by_user.first_name} ${invitation.invited_by_user.last_name}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[invitation.status]}`}>
                      {tInvitations(`list.status.${invitation.status}` as any)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--card-foreground)]">
                    {new Date(invitation.expires_at).toLocaleDateString(locale, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <InvitationRowActions
                      invitationId={invitation.id}
                      status={invitation.status}
                      token={invitation.token}
                      locale={locale}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {count && count > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--muted-foreground)]">
            Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, count)} de {count} convites
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?status=${status}&page=${page - 1}`}
                className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors"
              >
                Anterior
              </Link>
            )}
            {page * pageSize < count && (
              <Link
                href={`?status=${status}&page=${page + 1}`}
                className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors"
              >
                Próxima
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

