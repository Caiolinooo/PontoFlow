import UnifiedBottomNav from '@/components/UnifiedBottomNav';
import BackToDashboard from '@/components/BackToDashboard';
import AppShell from '@/components/AppShell';
import { requireRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';

export default async function ManagerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireRole(locale, ['ADMIN', 'MANAGER', 'MANAGER_TIMESHEET']);

  // Check if user is actually a manager of any group (unless ADMIN)
  if (user.role !== 'ADMIN') {
    const supabase = getServiceSupabase();
    const { data: mgrGroups } = await supabase
      .from('manager_group_assignments')
      .select('group_id')
      .eq('manager_id', user.id)
      .limit(1);

    if (!mgrGroups || mgrGroups.length === 0) {
      // User has MANAGER role but is not assigned to any group
      redirect(`/${locale}/dashboard`);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <BackToDashboard />
      </div>
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <AppShell>{children}</AppShell>
      </main>
      <UnifiedBottomNav initialUser={user} />
    </div>
  );
}

