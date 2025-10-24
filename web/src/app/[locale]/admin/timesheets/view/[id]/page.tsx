import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import TimesheetEditor from '@/components/employee/TimesheetEditor';
import { requireRole } from '@/lib/auth/server';
import { headers } from 'next/headers';
import { getServerSupabase } from '@/lib/supabase/server';

function firstDayOfNextMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth()+1, 1); }

export default async function AdminTimesheetView({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  await requireRole(locale, ['ADMIN']);

  // Reutiliza o mesmo endpoint do colaborador (ADMIN bypass ownership)
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host')!;
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;
  const res = await fetch(`${baseUrl}/api/employee/timesheets/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load timesheet');
  const data = await res.json();

  const messages = await getMessages();
  const dict = messages as Record<string, string | undefined>;
  const t = (k: string) => dict[k] ?? k;

  const periodoIni = new Date(data.timesheet.periodo_ini);
  const isClosed = new Date() >= firstDayOfNextMonth(periodoIni);
  const blocked = false; // ADMIN pode editar tudo, com aviso visual

  const supabase = await getServerSupabase();
  // Dados extras: quem gerencia (pelos grupos)
  const { data: mgrGroups } = await supabase
    .from('employee_group_members')
    .select('group_id')
    .eq('employee_id', data.timesheet.employee_id);
  const groupIds = (mgrGroups ?? []).map(g => g.group_id);
  let managers: any[] = [];
  if (groupIds.length) {
    const { data: ass } = await supabase
      .from('manager_group_assignments')
      .select('manager_id')
      .in('group_id', groupIds);
    const managerIds = (ass ?? []).map(a => a.manager_id);
    if (managerIds.length) {
      const { data: mgrUsers } = await supabase
        .from('users_unified')
        .select('id, name, email')
        .in('id', managerIds);
      managers = mgrUsers ?? [];
    }
  }

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-semibold">Timesheet (Admin)</h1>
                <p className="text-sm text-[var(--muted-foreground)]">Gerentes: {managers.map(m => m.name || m.email).join(', ') || '—'}</p>
                {isClosed && (
                  <div className="mt-2 text-xs px-3 py-2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                    Aviso: Este período está fechado. Como ADMIN, você pode editar mesmo assim.
                  </div>
                )}
              </div>
            </div>
            <TimesheetEditor
              timesheetId={data.timesheet.id}
              periodo_ini={data.timesheet.periodo_ini}
              blocked={blocked}
              entries={data.entries}
              annotations={data.annotations}
              labels={{
                title: t('employee.editor.sectionTitle'),
                submit: t('employee.editor.submit'),
                blocked: t('employee.editor.blocked'),
                date: t('employee.editor.date'),
                type: t('employee.editor.type'),
                start: t('employee.editor.start'),
                end: t('employee.editor.end'),
                note: t('employee.editor.note'),
                add: t('employee.editor.addEntry'),
                delete: t('employee.editor.delete'),
                annotations: t('employee.editor.annotations'),
                embarque: t('employee.editor.embarque'),
                desembarque: t('employee.editor.desembarque'),
                translado: t('employee.editor.translado'),
                onshore: t('employee.editor.onshore'),
                offshore: t('employee.editor.offshore'),
                folga: t('employee.editor.folga')
              }}
            />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

