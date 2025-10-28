import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/server';
import Link from 'next/link';
import GroupForm from '@/components/admin/delegations/GroupForm';

export default async function NewGroupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireRole(locale, ['ADMIN']);
  const t = await getTranslations({ locale, namespace: 'admin.delegations' });

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${locale}/admin/delegations`} className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">← {t('back')}</Link>
        <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">{t('newGroup')}</h1>
        <p className="mt-1 text-[var(--muted-foreground)]">{t('subtitle')}</p>
      </div>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <GroupForm locale={locale} />
      </div>
    </div>
  );
}

