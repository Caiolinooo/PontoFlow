import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import ReportsClient from '@/components/reports/ReportsClient';

export default async function ReportsPage() {
  const t = await getTranslations();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          {t('reports.title') || 'Reports'}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t('reports.description') || 'Generate and export timesheet reports'}
        </p>
      </div>
      <ReportsClient />
    </div>
  );
}

