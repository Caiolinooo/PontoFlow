import { getTranslations } from 'next-intl/server';
import { requireAuth } from '@/lib/auth/server';

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requireAuth(locale);
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  
  return (
    <div className="w-full space-y-8">
      {/* Header with gradient */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/10 via-transparent to-[var(--primary)]/5 rounded-2xl blur-3xl -z-10"></div>
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] bg-clip-text">{t('title')}</h1>
          <p className="mt-2 sm:mt-3 text-base sm:text-lg text-[var(--muted-foreground)]">{t('subtitle')}</p>
        </div>
      </div>

      {/* Quick Stats - Different for Admin/Manager vs Employee */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-[var(--card)] to-[var(--card)]/50 rounded-xl p-4 border border-[var(--border)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">{t('stats.hoursThisMonth')}</p>
              <p className="text-xl font-bold text-[var(--foreground)]">--</p>
            </div>
          </div>
        </div>

        {(user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') ? (
          <>
            <div className="bg-gradient-to-br from-[var(--card)] to-[var(--card)]/50 rounded-xl p-4 border border-[var(--border)] backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">{t('stats.approved')}</p>
                  <p className="text-xl font-bold text-[var(--foreground)]">--</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[var(--card)] to-[var(--card)]/50 rounded-xl p-4 border border-[var(--border)] backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">{t('stats.pending')}</p>
                  <p className="text-xl font-bold text-[var(--foreground)]">--</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Employee Stats - Offshore specific */}
            <div className="bg-gradient-to-br from-[var(--card)] to-[var(--card)]/50 rounded-xl p-4 border border-[var(--border)] backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">{t('stats.overtime50')}</p>
                  <p className="text-xl font-bold text-[var(--foreground)]">--</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[var(--card)] to-[var(--card)]/50 rounded-xl p-4 border border-[var(--border)] backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">{t('stats.overtime100')}</p>
                  <p className="text-xl font-bold text-[var(--foreground)]">--</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full max-w-6xl mx-auto pb-16">
        <a
          href={`/${locale}/employee/timesheets`}
          className="group relative bg-gradient-to-br from-[var(--card)] to-[var(--card)]/80 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 ease-out hover:-translate-y-1 p-6 border border-[var(--border)] hover:border-[var(--primary)]/50 ring-1 ring-transparent hover:ring-[var(--primary)]/30 overflow-hidden backdrop-blur"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[var(--primary)]/20 to-transparent opacity-0 group-hover:opacity-100 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-all duration-700 ease-out blur-2xl"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center ring-8 ring-[var(--primary)]/10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/10 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-[var(--primary)] group-hover:rotate-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[var(--card-foreground)] mb-2 group-hover:text-[var(--primary)] transition-colors duration-300">{t('modules.myTimesheet.title')}</h3>
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{t('modules.myTimesheet.description')}</p>
          </div>
        </a>

        {(user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET' || user.role === 'ADMIN') && (
          <a
            href={`/${locale}/manager/pending`}
            className="group relative bg-gradient-to-br from-[var(--card)] to-[var(--card)]/80 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 ease-out hover:-translate-y-1 p-6 border border-[var(--border)] hover:border-[var(--primary)]/50 ring-1 ring-transparent hover:ring-[var(--primary)]/30 overflow-hidden backdrop-blur"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[var(--primary)]/20 to-transparent opacity-0 group-hover:opacity-100 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-all duration-700 ease-out blur-2xl"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center ring-8 ring-[var(--primary)]/10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/10 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-[var(--primary)] group-hover:rotate-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[var(--card-foreground)] mb-2 group-hover:text-[var(--primary)] transition-colors duration-300">{t('modules.managerPending.title')}</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{t('modules.managerPending.description')}</p>
            </div>
          </a>
        )}

        <a
          href={`/${locale}/reports`}
          className="group relative bg-gradient-to-br from-[var(--card)] to-[var(--card)]/80 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 ease-out hover:-translate-y-1 p-6 border border-[var(--border)] hover:border-[var(--primary)]/50 ring-1 ring-transparent hover:ring-[var(--primary)]/30 overflow-hidden backdrop-blur"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[var(--primary)]/20 to-transparent opacity-0 group-hover:opacity-100 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-all duration-700 ease-out blur-2xl"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center ring-8 ring-[var(--primary)]/10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/10 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-[var(--primary)] group-hover:rotate-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[var(--card-foreground)] mb-2 group-hover:text-[var(--primary)] transition-colors duration-300">{t('modules.reports.title')}</h3>
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{t('modules.reports.description')}</p>
          </div>
        </a>

        {user.role === 'ADMIN' && (
          <a
            href={`/${locale}/admin/users`}
            className="group relative bg-gradient-to-br from-[var(--card)] to-[var(--card)]/80 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 ease-out hover:-translate-y-1 p-6 border border-[var(--border)] hover:border-[var(--primary)]/50 ring-1 ring-transparent hover:ring-[var(--primary)]/30 overflow-hidden backdrop-blur"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[var(--primary)]/20 to-transparent opacity-0 group-hover:opacity-100 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-all duration-700 ease-out blur-2xl"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center ring-8 ring-[var(--primary)]/10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/10 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-[var(--primary)] group-hover:rotate-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[var(--card-foreground)] mb-2 group-hover:text-[var(--primary)] transition-colors duration-300">{t('modules.admin.title')}</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{t('modules.admin.description')}</p>
            </div>
          </a>
        )}

        <a
          href={`/${locale}/settings/notifications`}
          className="group relative bg-gradient-to-br from-[var(--card)] to-[var(--card)]/80 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 ease-out hover:-translate-y-1 p-6 border border-[var(--border)] hover:border-[var(--primary)]/50 ring-1 ring-transparent hover:ring-[var(--primary)]/30 overflow-hidden backdrop-blur"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[var(--primary)]/20 to-transparent opacity-0 group-hover:opacity-100 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-all duration-700 ease-out blur-2xl"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center ring-8 ring-[var(--primary)]/10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/10 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-[var(--primary)] group-hover:rotate-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[var(--card-foreground)] mb-2 group-hover:text-[var(--primary)] transition-colors duration-300">{t('modules.settings.title')}</h3>
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{t('modules.settings.description')}</p>
          </div>
        </a>
      </div>
    </div>
  );
}