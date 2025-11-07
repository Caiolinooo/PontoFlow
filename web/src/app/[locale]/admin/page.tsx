import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/server';
import { MetaPageHeader } from '@/components/ui/meta/PageHeader';

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requireRole(locale, ['ADMIN']);
  const t = await getTranslations({ locale, namespace: 'admin' });

  const adminModules = [
    {
      title: t('modules.users.title') || 'Users',
      description: t('modules.users.description') || 'Manage user accounts, invitations, and permissions',
      href: `/${locale}/admin/users`,
      icon: 'M3 7h18M3 12h18M3 17h18',
      color: 'from-blue-500/20 to-blue-600/10'
    },
    {
      title: t('modules.employees.title') || 'Employees',
      description: t('modules.employees.description') || 'Manage employee profiles and assignments',
      href: `/${locale}/admin/employees`,
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      color: 'from-green-500/20 to-green-600/10'
    },
    {
      title: t('modules.timesheets.title') || 'Timesheets',
      description: t('modules.timesheets.description') || 'Review and manage all timesheet entries',
      href: `/${locale}/admin/timesheets`,
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      color: 'from-purple-500/20 to-purple-600/10'
    },
    {
      title: t('modules.tenants.title') || 'Tenants',
      description: t('modules.tenants.description') || 'Manage organizations and multi-tenant settings',
      href: `/${locale}/admin/tenants`,
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      color: 'from-orange-500/20 to-orange-600/10'
    },
    {
      title: t('modules.environments.title') || 'Environments',
      description: t('modules.environments.description') || 'Configure work environments and locations',
      href: `/${locale}/admin/environments`,
      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      color: 'from-teal-500/20 to-teal-600/10'
    },
    {
      title: t('modules.periods.title') || 'Periods',
      description: t('modules.periods.description') || 'Manage reporting periods and locks',
      href: `/${locale}/admin/periods`,
      icon: 'M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8a1 1 0 011-1h3z',
      color: 'from-indigo-500/20 to-indigo-600/10'
    },
    {
      title: t('modules.delegations.title') || 'Delegations & Groups',
      description: t('modules.delegations.description') || 'Organize teams and manage manager assignments',
      href: `/${locale}/admin/delegations`,
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      color: 'from-pink-500/20 to-pink-600/10'
    },
    {
      title: t('modules.vessels.title') || 'Vessels',
      description: t('modules.vessels.description') || 'Manage vessels and floating platforms',
      href: `/${locale}/admin/vessels`,
      icon: 'M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8a1 1 0 011-1h3z',
      color: 'from-cyan-500/20 to-cyan-600/10'
    },
    {
      title: t('modules.workSchedules.title') || 'Work Schedules',
      description: t('modules.workSchedules.description') || 'Configure work schedules and templates',
      href: `/${locale}/admin/work-schedules`,
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'from-amber-500/20 to-amber-600/10'
    },
    {
      title: t('modules.settings.title') || 'Settings',
      description: t('modules.settings.description') || 'System configuration and preferences',
      href: `/${locale}/admin/settings`,
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      color: 'from-gray-500/20 to-gray-600/10'
    }
  ];

  return (
    <div className="w-full space-y-8">
      <MetaPageHeader
        title={t('dashboard.title') || 'Administration'}
        subtitle={t('dashboard.description') || 'Manage system settings and user data'}
        breadcrumbs={[
          { href: `/${locale}/dashboard`, label: t('nav.dashboard') || 'Dashboard' },
          { label: t('adminNav.system') || 'Admin' }
        ]}
      />

      {/* Admin Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl mx-auto">
        {adminModules.map((module) => (
          <a
            key={module.title}
            href={module.href}
            className="group relative bg-gradient-to-br from-[var(--card)] to-[var(--card)]/80 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 ease-out hover:-translate-y-1 p-6 border border-[var(--border)] hover:border-[var(--primary)]/50 ring-1 ring-transparent hover:ring-[var(--primary)]/30 overflow-hidden backdrop-blur"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[var(--primary)]/20 to-transparent opacity-0 group-hover:opacity-100 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-all duration-700 ease-out blur-2xl"></div>
            <div className={`absolute inset-0 bg-gradient-to-br from-transparent via-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${module.color}`}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center ring-8 ring-[var(--primary)]/10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/10 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-[var(--primary)] group-hover:rotate-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={module.icon} />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[var(--card-foreground)] mb-2 group-hover:text-[var(--primary)] transition-colors duration-300">{module.title}</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{module.description}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
        <h2 className="text-2xl font-bold text-[var(--card-foreground)] mb-4">{t('quickActions.title') || 'Quick Actions'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href={`/${locale}/admin/users/new`}
            className="flex items-center justify-center px-4 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('quickActions.addUser') || 'Add User'}
          </a>
          
          <a
            href={`/${locale}/admin/employees/new`}
            className="flex items-center justify-center px-4 py-3 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            {t('quickActions.addEmployee') || 'Add Employee'}
          </a>
          
          <a
            href={`/${locale}/admin/environments/new`}
            className="flex items-center justify-center px-4 py-3 bg-[var(--muted)] text-[var(--muted-foreground)] rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {t('quickActions.addEnvironment') || 'Add Environment'}
          </a>
          
          <a
            href={`/${locale}/admin/tenants`}
            className="flex items-center justify-center px-4 py-3 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            {t('quickActions.manageTenants') || 'Manage Tenants'}
          </a>
        </div>
      </div>
    </div>
  );
}