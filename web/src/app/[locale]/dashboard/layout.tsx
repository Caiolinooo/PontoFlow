import UnifiedBottomNav from '@/components/UnifiedBottomNav';
import AppShell from '@/components/AppShell';
import { requireAuth } from '@/lib/auth/server';

export default async function DashboardLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireAuth(locale);
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-16">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AppShell>{children}</AppShell>
      </main>
      <UnifiedBottomNav initialUser={user} />
    </div>
  );
}

