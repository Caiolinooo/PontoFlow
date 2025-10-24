import { getTranslations } from 'next-intl/server';
import { requireAuth } from '@/lib/auth/server';

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requireAuth(locale);
  const t = await getTranslations('dashboard');
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">{t('title')}</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">{t('subtitle')}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <a
          href={`/${locale}/employee/timesheets`}
          className="group relative bg-[var(--card)] rounded-xl shadow-md hover:shadow-xl transition-all duration-500 ease-out hover:translate-y-0.5 p-6 border border-[var(--border)] hover:border-transparent ring-1 ring-transparent hover:ring-[var(--primary)]/30 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)] opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700 ease-out"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center ring-8 ring-[var(--primary)]/10 bg-[var(--primary)]/10">
                <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-2">{t('modules.myTimesheet.title')}</h3>
            <p className="text-sm text-[var(--muted-foreground)]">{t('modules.myTimesheet.description')}</p>
          </div>
        </a>

        {(user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET' || user.role === 'ADMIN') && (
          <a 
            href={`/${locale}/manager/pending`} 
            className="group relative bg-[var(--card)] rounded-xl shadow-md hover:shadow-xl transition-all duration-500 ease-out hover:translate-y-0.5 p-6 border border-[var(--border)] hover:border-transparent ring-1 ring-transparent hover:ring-[var(--primary)]/30 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)] opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700 ease-out"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center ring-8 ring-[var(--primary)]/10 bg-[var(--primary)]/10">
                  <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-2">{t('modules.managerPending.title')}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{t('modules.managerPending.description')}</p>
            </div>
          </a>
        )}

        <a 
          href={`/${locale}/reports`} 
          className="group relative bg-[var(--card)] rounded-xl shadow-md hover:shadow-xl transition-all duration-500 ease-out hover:translate-y-0.5 p-6 border border-[var(--border)] hover:border-transparent ring-1 ring-transparent hover:ring-[var(--primary)]/30 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)] opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700 ease-out"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center ring-8 ring-[var(--primary)]/10 bg-[var(--primary)]/10">
                <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-2">{t('modules.reports.title')}</h3>
            <p className="text-sm text-[var(--muted-foreground)]">{t('modules.reports.description')}</p>
          </div>
        </a>

        {user.role === 'ADMIN' && (
          <a
            href={`/${locale}/admin/users`}
            className="group relative bg-[var(--card)] rounded-xl shadow-md hover:shadow-xl transition-all duration-500 ease-out hover:translate-y-0.5 p-6 border border-[var(--border)] hover:border-transparent ring-1 ring-transparent hover:ring-[var(--primary)]/30 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)] opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700 ease-out"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center ring-8 ring-[var(--primary)]/10 bg-[var(--primary)]/10">
                  <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-2">Admin</h3>
              <p className="text-sm text-[var(--muted-foreground)]">Configurações e gestão do sistema</p>
            </div>
          </a>
        )}

        <a
          href={`/${locale}/settings/notifications`}
          className="group relative bg-[var(--card)] rounded-xl shadow-md hover:shadow-xl transition-all duration-500 ease-out hover:translate-y-0.5 p-6 border border-[var(--border)] hover:border-transparent ring-1 ring-transparent hover:ring-[var(--primary)]/30 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)] opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700 ease-out"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center ring-8 ring-[var(--primary)]/10 bg-[var(--primary)]/10">
                <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-2">{t('modules.settings.title')}</h3>
            <p className="text-sm text-[var(--muted-foreground)]">{t('modules.settings.description')}</p>
          </div>
        </a>
      </div>
    </div>
  );
}