import { requireRole } from '@/lib/auth/server';
import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import RoleSelect from '@/components/admin/RoleSelect';
import { getTranslations } from 'next-intl/server';

export default async function AccessControlPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin.accessControl' });
  await requireRole(locale, ['ADMIN']);

  const supabase = await getServerSupabase();
  // Listar usuários e papel atual
  const { data: users } = await supabase
    .from('users_unified')
    .select('id, email, name, role, active, created_at')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">{t('title')}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{t('subtitle')}</p>
        </div>
        <Link href={`/${locale}/admin/delegations`} className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90">{t('manageDelegations')}</Link>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
            <tr>
              <th className="text-left px-6 py-3 font-medium">{t('user')}</th>
              <th className="text-left px-6 py-3 font-medium">{t('email')}</th>
              <th className="text-left px-6 py-3 font-medium">{t('role')}</th>
              <th className="text-left px-6 py-3 font-medium">{t('active')}</th>
              <th className="text-right px-6 py-3 font-medium">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} className="border-t border-[var(--border)]">
                <td className="px-6 py-3 text-[var(--foreground)]">{u.name ?? u.id}</td>
                <td className="px-6 py-3 text-[var(--foreground)]">{u.email}</td>
                <td className="px-6 py-3">
                  <RoleSelect userId={u.id} current={u.role} />
                </td>
                <td className="px-6 py-3">{u.active ? t('yes') : t('no')}</td>
                <td className="px-6 py-3 text-right">
                  <Link href={`/${locale}/admin/users/${u.id}`} className="px-2 py-1 rounded-md bg-[var(--muted)] text-[var(--foreground)]">{t('edit')}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-[var(--muted-foreground)]">
        {t('futureNote')}
      </div>
    </div>
  );
}


