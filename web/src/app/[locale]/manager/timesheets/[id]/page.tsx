import {getMessages, getTranslations} from 'next-intl/server';
import {NextIntlClientProvider} from 'next-intl';
import Actions from '@/components/manager/ReviewActions';
import AckStatus from '@/components/manager/AckStatus';
import EntryActions from '@/components/manager/EntryRowActions';
import ManagerAddEntry from '@/components/manager/ManagerAddEntry';


type Entry = { id: string; data: string; tipo: string; hora_ini?: string | null; hora_fim?: string | null; observacao?: string | null };
type Annotation = { id: string; field_path?: string | null; message: string };

type Approval = { id: string; status: string; created_at: string };

type Data = {
  timesheet: { id: string; periodo_ini: string; periodo_fim: string; status: string };
  employee?: { display_name?: string | null; cargo?: string | null };
  profile?: { display_name?: string | null; email?: string | null };
  entries: Entry[];
  annotations: Annotation[];
  approvals: Approval[];
};

import { headers, cookies } from 'next/headers';

async function getData(id: string): Promise<Data> {
  // Get the base URL from environment or construct it from headers
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;

  // Get cookies to pass session token
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('timesheet_session')?.value;

  const res = await fetch(`${baseUrl}/api/manager/timesheets/${id}`, {
    cache: 'no-store',
    headers: {
      'Cookie': `timesheet_session=${sessionToken || ''}`
    }
  });
  if (!res.ok) throw new Error('Failed to load timesheet');
  return res.json();
}

export default async function Page({params}: {params: Promise<{locale: string; id: string}>}) {
  const {locale, id} = await params;
  const messages = await getMessages();
  const data = await getData(id);
  const t = await getTranslations('manager.review');

  return (
    <div className="space-y-6">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">{t('title')}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">{t('subtitle')}</p>
      </div>

      <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="font-medium mb-3 text-[var(--foreground)]">{t('timesheet')}</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-sm text-[var(--foreground)] space-y-1">
            <div>
              <span className="text-[var(--muted-foreground)]">{t('employee')}:</span>{' '}
              <span className="font-medium">{data?.employee?.display_name || data?.profile?.display_name || '\u2014'}</span>
              {data?.profile?.email && (
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{data.profile.email}</div>
              )}
            </div>
            <div><span className="text-[var(--muted-foreground)]">{t('period')}:</span> {data?.timesheet?.periodo_ini} - {data?.timesheet?.periodo_fim}</div>
            <div><span className="text-[var(--muted-foreground)]">{t('status')}:</span> {data?.timesheet?.status}</div>
          </div>
          <div className="md:col-span-2"><AckStatus timesheetId={data?.timesheet?.id} /></div>
        </div>
      </section>

      <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-[var(--foreground)]">{t('entries')}</h2>
          <ManagerAddEntry timesheetId={data?.timesheet?.id} />
        </div>
        <div className="overflow-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">{t('date')}</th>
                <th className="px-4 py-2 font-medium">{t('type')}</th>
                <th className="px-4 py-2 font-medium">{t('start')}</th>
                <th className="px-4 py-2 font-medium">{t('end')}</th>
                <th className="px-4 py-2 font-medium">{t('note')}</th>
                <th className="px-4 py-2 font-medium text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.entries ?? [])
                .sort((a: Entry, b: Entry) => {
                  // Sort by date first, then by hora_ini
                  if (a.data !== b.data) return a.data.localeCompare(b.data);
                  const timeA = a.hora_ini || '99:99';
                  const timeB = b.hora_ini || '99:99';
                  return timeA.localeCompare(timeB);
                })
                .map((e: Entry) => (
                <tr key={e.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-2 text-[var(--foreground)]">{e.data}</td>
                  <td className="px-4 py-2 text-[var(--foreground)]">{e.tipo}</td>
                  <td className="px-4 py-2 text-[var(--foreground)]">{e.hora_ini ?? '-'}</td>
                  <td className="px-4 py-2 text-[var(--foreground)]">{e.hora_fim ?? '-'}</td>
                  <td className="px-4 py-2 text-[var(--foreground)]">{e.observacao ?? '-'}</td>
                  <td className="px-4 py-2"><EntryActions timesheetId={data?.timesheet?.id} entry={e as any} /></td>
                </tr>
              ))}
              {(data?.entries?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[var(--muted-foreground)]">{t('noEntries')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="font-medium mb-3 text-[var(--foreground)]">{t('annotations')}</h2>
        <ul className="list-disc pl-5 text-sm text-[var(--foreground)]">
          {(data?.annotations ?? []).map((a: Annotation) => (
            <li key={a.id}>
              {a.field_path ? (<strong>{a.field_path}: </strong>) : null}{a.message}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="font-medium mb-3 text-[var(--foreground)]">{t('approvals')}</h2>
        <ul className="list-disc pl-5 text-sm text-[var(--foreground)]">
          {(data?.approvals ?? []).map((ap: Approval) => (
            <li key={ap.id}>{ap.status} - {new Date(ap.created_at).toLocaleString()}</li>
          ))}
        </ul>
      </section>

      <NextIntlClientProvider messages={messages}>
        <Actions timesheetId={data?.timesheet?.id} entries={data?.entries} />
      </NextIntlClientProvider>
    </div>
  );
}


