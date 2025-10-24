import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/server';
import Link from 'next/link';
import { headers } from 'next/headers';
import GroupDetailPanel from '@/components/admin/delegations/GroupDetailPanel';
import { MetaPageHeader } from '@/components/ui/meta/PageHeader';
import { isMetaUI } from '@/lib/flags';

export default async function EditGroupPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  await requireRole(locale, ['ADMIN']);
  const t = await getTranslations('admin.delegations');

  // Load group details from our API (managers/members)
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host')!;
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;
  const res = await fetch(`${baseUrl}/api/admin/delegations/groups/${id}`, { cache: 'no-store' });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    const tenantRequired = res.status === 409 && j?.error === 'tenant_required';
    const subtitle = tenantRequired
      ? 'Selecione um tenant no topo para continuar.'
      : (j?.error ? `Erro: ${j.error}` : 'Grupo não encontrado');
    return (
      <div className="space-y-4">
        {isMetaUI() ? (
          <MetaPageHeader
            title={t('editGroup')}
            subtitle={subtitle}
            breadcrumbs={[
              { href: `/${locale}/dashboard`, label: 'Dashboard' },
              { href: `/${locale}/admin/delegations`, label: t('title') },
              { label: t('editGroup') },
            ]}
          />
        ) : (
          <div>
            <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">{t('editGroup')}</h1>
            <p className="mt-2 text-[var(--muted-foreground)]">{subtitle}</p>
          </div>
        )}
      </div>
    );
  }
  const { group, managers, members, vesselsOptions, vesselLinks, employeesOptions, managersOptions } = await res.json();

  return (
    <div className="space-y-6">
      {isMetaUI() ? (
        <MetaPageHeader
          title={t('editGroup')}
          subtitle={group?.name}
          breadcrumbs={[
            { href: `/${locale}/dashboard`, label: 'Dashboard' },
            { href: `/${locale}/admin/delegations`, label: t('title') },
            { label: group?.name || t('editGroup') },
          ]}
        />
      ) : (
        <div>
          <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">{t('editGroup')}</h1>
          <p className="mt-1 text-[var(--muted-foreground)]">{group?.name}</p>
        </div>
      )}

      <GroupDetailPanel
        groupId={id}
        locale={locale}
        initialManagers={managers}
        initialMembers={members}
        managersOptions={managersOptions}
        employeesOptions={employeesOptions}
        vesselsOptions={(vesselsOptions || []).map((v: any) => ({ id: v.id, label: v.name }))}
        initialVesselLinks={vesselLinks || []}
      />
    </div>
  );
}

