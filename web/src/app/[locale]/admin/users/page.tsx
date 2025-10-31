import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/server';
import Link from 'next/link';
import UserRowActions from '@/components/admin/UserRowActions';
import { getServerSupabase } from '@/lib/supabase/server';

export default async function AdminUsersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>>; }) {
  const { locale } = await params;
  const sp = (await (searchParams ?? Promise.resolve({}))) || {};
  const get = (k: string) => {
    const v = (sp as any)[k];
    return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
  };
  const q = get('q').toString().trim();
  const role = get('role').toString().trim();
  const status = get('status').toString().trim();
  const page = Math.max(parseInt((get('page') || '1') as string, 10) || 1, 1);
  const pageSize = 20;
  await requireRole(locale, ['ADMIN']);

  const supabase = await getServerSupabase();
  let query = supabase.from('users_unified').select('*', { count: 'exact' });
  if (q) {
    // search by email, first_name, last_name
    query = query.or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
  }
  if (role) {
    query = query.eq('role', role);
  }
  if (status === 'active') {
    query = query.eq('active', true);
  } else if (status === 'inactive') {
    query = query.eq('active', false);
  }
  query = query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  const { data: users, count } = await query;

  const t = await getTranslations({ locale, namespace: 'admin.users' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">{t('title')}</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">{t('subtitle')}</p>
        </div>
        <Link
          href={`/${locale}/admin/users/new`}
          className="inline-flex items-center px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('newUser')}
        </Link>
      </div>

      {/* Filters */}
      <form method="get" className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex flex-wrap gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder={t('searchPlaceholder')}
          className="flex-1 min-w-56 border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded-lg px-3 py-2"
        />
        <select name="role" defaultValue={role} className="border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded-lg px-3 py-2">
          <option value="">{t('anyRole')}</option>
          <option value="USER">USER</option>
          <option value="MANAGER_TIMESHEET">MANAGER_TIMESHEET</option>
          <option value="MANAGER">MANAGER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <select name="status" defaultValue={status} className="border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded-lg px-3 py-2">
          <option value="">{t('anyStatus')}</option>
          <option value="active">{t('active')}</option>
          <option value="inactive">{t('inactive')}</option>
        </select>
        <button className="px-4 py-2 bg-[var(--muted)] text-[var(--foreground)] rounded-lg">{t('filter')}</button>
      </form>

      {!users || users.length === 0 ? (
        <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-[var(--muted-foreground)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="text-lg font-medium text-[var(--card-foreground)] mb-2">{t('noUsers')}</h3>
          <p className="text-[var(--muted-foreground)]">{t('noUsersDescription')}</p>
        </div>
      ) : (
        <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{t('name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{t('email')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{t('role')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{t('department')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{t('status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--card)] divide-y divide-[var(--border)]">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-[var(--muted)]/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.drive_photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.drive_photo_url}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--primary)]/10">
                          <span className="text-[var(--primary)] font-medium">
                            {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-[var(--card-foreground)]">{user.first_name} {user.last_name}</div>
                        <div className="text-sm text-[var(--muted-foreground)]">{user.position || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--card-foreground)]">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'ADMIN' ? 'bg-purple-500/15 text-purple-500' :
                      (user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') ? 'bg-blue-500/15 text-blue-500' :
                      'bg-slate-500/15 text-slate-500'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--card-foreground)]">{user.department || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.active ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'
                    }`}>
                      {user.active ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <UserRowActions userId={user.id} locale={locale} editLabel={t('edit')} deleteLabel={t('delete')} />
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

