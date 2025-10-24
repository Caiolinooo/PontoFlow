import ReportsClient from '@/components/reports/ReportsClient';

export default async function ReportsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Reports</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Generate and export timesheet reports</p>
      </div>
      <ReportsClient />
    </div>
  );
}

