import Header from '@/components/Header';
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
      <Header initialUser={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AppShell>{children}</AppShell>
      </main>
    </div>
  );
}

