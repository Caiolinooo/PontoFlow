import UnifiedBottomNav from '@/components/UnifiedBottomNav';
import DeveloperFooter from '@/components/DeveloperFooter';
import BackToDashboard from '@/components/BackToDashboard';
import AppShell from '@/components/AppShell';
import { requireRole } from '@/lib/auth/server';

export default async function ManagerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireRole(locale, ['ADMIN', 'MANAGER', 'MANAGER_TIMESHEET']);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <BackToDashboard />
      </div>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        <AppShell>{children}</AppShell>
      </main>
      <DeveloperFooter />
      <UnifiedBottomNav initialUser={user} />
    </div>
  );
}

