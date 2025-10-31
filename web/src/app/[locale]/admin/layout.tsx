import UnifiedBottomNav from '@/components/UnifiedBottomNav';
import { requireRole } from '@/lib/auth/server';
import BackToDashboard from '@/components/BackToDashboard';

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requireRole(locale, ['ADMIN']);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <BackToDashboard />
      </div>
      
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {children}
      </main>
      <UnifiedBottomNav initialUser={user} />
    </div>
  );
}
