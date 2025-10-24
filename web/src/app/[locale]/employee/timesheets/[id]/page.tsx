import {getMessages} from 'next-intl/server';
import {NextIntlClientProvider} from 'next-intl';
import TimesheetEditor from '@/components/employee/TimesheetEditor';
import FullBleed from '@/components/layout/FullBleed';

async function getData(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/employee/timesheets/${id}`, {cache:'no-store'});
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

function firstDayOfNextMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth()+1, 1); }

export default async function Page({params}: {params: Promise<{locale: string; id: string}>}) {
  const {locale, id} = await params;
  const messages = await getMessages();
  const dict = messages as Record<string, string | undefined>;
  const t = (k: string) => dict[k] ?? k;
  const data = await getData(id);

  const periodoIni = new Date(data.timesheet.periodo_ini);
  const blocked = new Date() >= firstDayOfNextMonth(periodoIni);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold">{t('employee.editor.title')}</h1>
              <p className="text-sm text-gray-600">{t('employee.editor.subtitle')}</p>
            </div>
            <FullBleed>
              <div className="px-4 sm:px-6 lg:px-8">
                <TimesheetEditor
                  timesheetId={data.timesheet.id}
                  periodo_ini={data.timesheet.periodo_ini}
                  blocked={blocked}
                  entries={data.entries}
                  annotations={data.annotations}
                  fullHeight
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
            </FullBleed>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
