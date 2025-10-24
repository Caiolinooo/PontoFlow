import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/server';
import AdminUserForm from '@/components/admin/AdminUserForm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';

export default async function EditUserPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params;
  await requireRole(locale, ['ADMIN']);

  // Get user data
  const supabase = await getServerSupabase();
  const { data: user, error } = await supabase
    .from('users_unified')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !user) {
    notFound();
  }

  const t = await getTranslations('admin.users');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/admin/users`}
          className="inline-flex items-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('back')}
        </Link>
      </div>

      <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--card-foreground)]">{t('editUser')}</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">{t('editUserDescription')}</p>
        </div>

        <AdminUserForm user={user} />
      </div>
    </div>
  );
}

