import { getTranslations } from 'next-intl/server';
import { requireAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import AlertBanner from '@/components/AlertBanner';
import DashboardMetrics from '@/components/dashboard/DashboardMetrics';
import EmployeePendingStatus from '@/components/employee/EmployeePendingStatus';

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requireAuth(locale);
  const t = await getTranslations({ locale, namespace: 'dashboard' });

  // Check if user is actually a manager of any group
  let isActualManager = false;
  if (user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') {
    const supabase = getServiceSupabase();
    const { data: mgrGroups } = await supabase
      .from('manager_group_assignments')
      .select('group_id')
      .eq('manager_id', user.id)
      .limit(1);
    isActualManager = (mgrGroups && mgrGroups.length > 0) || false;
  } else if (user.role === 'ADMIN') {
    // Admins always have access
    isActualManager = true;
  }

  return (
    <div className="h-screen w-full flex flex-col animate-gentle-fade-in overflow-hidden">
      {/* Header Section - Compact */}
      <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 animate-slide-in-down">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/10 via-transparent to-[var(--primary)]/5 rounded-2xl blur-3xl -z-10 animate-parallax-float"></div>
          <div className="relative">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--foreground)] bg-clip-text animate-gentle-fade-in">{t('title')}</h1>
            <p className="mt-1 text-sm sm:text-base text-[var(--muted-foreground)] animate-fade-in">{t('subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Content Area - Scrollable but constrained */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8 overflow-y-auto">
        {/* Alerts */}
        {/** in-app alerts (deadline/pending) */}
        <div className="mb-6 animate-slide-in-up">
          <AlertBanner />
        </div>

        {/* Employee Pending Status - For regular users */}
        {user.role === 'USER' && (
          <div className="mb-6 animate-slide-in-up stagger-enhanced">
            <EmployeePendingStatus />
          </div>
        )}

        {/* Dashboard Metrics - Real-time data */}
        <div className="mb-8 animate-slide-in-up stagger-enhanced">
          <DashboardMetrics userRole={user.role} />
        </div>

        {/* Main Modules Grid - Viewport-constrained */}
        <div className="pb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 lg:gap-6 max-h-[calc(100vh-420px)] lg:max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
            <div className="animate-slide-in-scale stagger-enhanced">
              <a
                href={`/${locale}/employee/timesheets`}
                className="group relative bg-gradient-to-br from-[var(--card)] to-[var(--card)]/80 rounded-xl shadow-lg hover:shadow-xl transition-all duration-600 ease-out hover:-translate-y-1 p-4 border border-[var(--border)] hover:border-[var(--primary)]/50 ring-1 ring-transparent hover:ring-[var(--primary)]/20 overflow-hidden backdrop-blur card-hover animate-slide-in-scale h-full min-h-[160px] sm:min-h-[180px] flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[var(--primary)]/20 to-transparent opacity-0 group-hover:opacity-100 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-all duration-700 ease-out blur-xl"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center ring-4 ring-[var(--primary)]/10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/10 group-hover:scale-110 transition-transform duration-400 animate-pulse">
                        <svg className="w-5 h-5 text-[var(--primary)] group-hover:rotate-6 transition-transform duration-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <svg className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all duration-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[var(--card-foreground)] mb-1 group-hover:text-[var(--primary)] transition-colors duration-400">{t('modules.myTimesheet.title')}</h3>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed line-clamp-2">{t('modules.myTimesheet.description')}</p>
                </div>
              </a>
            </div>

            {isActualManager && (
              <>
                <div className="animate-slide-in-scale stagger-enhanced">
                  <a
                    href={`/${locale}/manager/pending`}
                    className="group relative bg-gradient-to-br from-[var(--card)] to-[var(--card)]/80 rounded-xl shadow-lg hover:shadow-xl transition-all duration-600 ease-out hover:-translate-y-1 p-4 border border-[var(--border)] hover:border-[var(--primary)]/50 ring-1 ring-transparent hover:ring-[var(--primary)]/20 overflow-hidden backdrop-blur card-hover h-full min-h-[160px] sm:min-h-[180px] flex flex-col justify-between"
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[var(--primary)]/20 to-transparent opacity-0 group-hover:opacity-100 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-all duration-700 ease-out blur-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative h-full flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center ring-4 ring-[var(--primary)]/10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/10 group-hover:scale-110 transition-transform duration-400 animate-pulse">
                            <svg className="w-5 h-5 text-[var(--primary)] group-hover:rotate-6 transition-transform duration-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <svg className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all duration-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-[var(--card-foreground)] mb-1 group-hover:text-[var(--primary)] transition-colors duration-400">{t('modules.managerPending.title')}</h3>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed line-clamp-2">{t('modules.managerPending.description')}</p>
                    </div>
                  </a>
                </div>
              </>
            )}

            <div className="animate-slide-in-scale stagger-enhanced">
              <a
                href={`/${locale}/reports`}
                className="group relative bg-gradient-to-br from-[var(--card)] to-[var(--card)]/80 rounded-xl shadow-lg hover:shadow-xl transition-all duration-600 ease-out hover:-translate-y-1 p-4 border border-[var(--border)] hover:border-[var(--primary)]/50 ring-1 ring-transparent hover:ring-[var(--primary)]/20 overflow-hidden backdrop-blur card-hover h-full min-h-[160px] sm:min-h-[180px] flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[var(--primary)]/20 to-transparent opacity-0 group-hover:opacity-100 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-all duration-700 ease-out blur-xl"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center ring-4 ring-[var(--primary)]/10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/10 group-hover:scale-110 transition-transform duration-400 animate-pulse">
                        <svg className="w-5 h-5 text-[var(--primary)] group-hover:rotate-6 transition-transform duration-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <svg className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all duration-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[var(--card-foreground)] mb-1 group-hover:text-[var(--primary)] transition-colors duration-400">{t('modules.reports.title')}</h3>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed line-clamp-2">{t('modules.reports.description')}</p>
                </div>
              </a>
            </div>

            {user.role === 'ADMIN' && (
              <div className="animate-slide-in-scale stagger-enhanced">
                <a
                  href={`/${locale}/admin/users`}
                  className="group relative bg-gradient-to-br from-[var(--card)] to-[var(--card)]/80 rounded-xl shadow-lg hover:shadow-xl transition-all duration-600 ease-out hover:-translate-y-1 p-4 border border-[var(--border)] hover:border-[var(--primary)]/50 ring-1 ring-transparent hover:ring-[var(--primary)]/20 overflow-hidden backdrop-blur card-hover h-full min-h-[160px] sm:min-h-[180px] flex flex-col justify-between"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[var(--primary)]/20 to-transparent opacity-0 group-hover:opacity-100 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-all duration-700 ease-out blur-xl"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center ring-4 ring-[var(--primary)]/10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/10 group-hover:scale-110 transition-transform duration-400 animate-pulse">
                          <svg className="w-5 h-5 text-[var(--primary)] group-hover:rotate-6 transition-transform duration-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                          </svg>
                        </div>
                        <svg className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all duration-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-[var(--card-foreground)] mb-1 group-hover:text-[var(--primary)] transition-colors duration-400">{t('modules.admin.title')}</h3>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed line-clamp-2">{t('modules.admin.description')}</p>
                  </div>
                </a>
              </div>
            )}

            <div className="animate-slide-in-scale stagger-enhanced">
              <a
                href={`/${locale}/settings/notifications`}
                className="group relative bg-gradient-to-br from-[var(--card)] to-[var(--card)]/80 rounded-xl shadow-lg hover:shadow-xl transition-all duration-600 ease-out hover:-translate-y-1 p-4 border border-[var(--border)] hover:border-[var(--primary)]/50 ring-1 ring-transparent hover:ring-[var(--primary)]/20 overflow-hidden backdrop-blur card-hover h-full min-h-[160px] sm:min-h-[180px] flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[var(--primary)]/20 to-transparent opacity-0 group-hover:opacity-100 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-all duration-700 ease-out blur-xl"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center ring-4 ring-[var(--primary)]/10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/10 group-hover:scale-110 transition-transform duration-400 animate-pulse">
                        <svg className="w-5 h-5 text-[var(--primary)] group-hover:rotate-6 transition-transform duration-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <svg className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all duration-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[var(--card-foreground)] mb-1 group-hover:text-[var(--primary)] transition-colors duration-400">{t('modules.settings.title')}</h3>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed line-clamp-2">{t('modules.settings.description')}</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}