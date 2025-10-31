import UnifiedBottomNav from '@/components/UnifiedBottomNav';
import BackToDashboard from '@/components/BackToDashboard';
import AppShell from '@/components/AppShell';
import { requireAuth } from '@/lib/auth/server';

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireAuth(locale);
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

