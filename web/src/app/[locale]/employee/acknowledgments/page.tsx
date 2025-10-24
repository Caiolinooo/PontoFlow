import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import EmployeeAcknowledgments from '@/components/employee/EmployeeAcknowledgments';

async function getPending() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/employee/audit/pending`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load');
  const j = await res.json();
  return j.items as Array<{ auditId: string; createdAt: string; justification: string; managerName: string; declarationUrl: string }>;
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const messages = await getMessages();
  const items = await getPending();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <div className="space-y-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Ciência de ajustes</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Ajustes realizados pelo gestor em períodos fechados que requerem sua ciência.</p>
        </div>

        <EmployeeAcknowledgments initial={items} />
      </div>
    </NextIntlClientProvider>
  );
}

