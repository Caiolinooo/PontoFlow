import { requireRole } from '@/lib/auth/server';
import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';

export default async function AdminTimesheetsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> }) {
  const { locale } = await params;
  const { q } = await searchParams;
  await requireRole(locale, ['ADMIN']);

  const query = (q ?? '').trim();
  const supabase = await getServerSupabase();
  let list: any[] = [];
  if (query) {
    const { data } = await supabase
      .from('employees')
      .select('id, display_name, profile_id, vessel_id, cargo')
      .ilike('display_name', `%${query}%`)
      .limit(50);
    list = data ?? [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Timesheets (Admin)</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Busque um colaborador e visualize/edite seus timesheets por mês.</p>
        </div>
      </div>

      <form className="flex gap-2" method="get">
        <input name="q" placeholder="Pesquisar colaborador" defaultValue={query} className="border rounded px-3 py-2 w-full max-w-lg bg-[var(--card)] text-[var(--foreground)] border-[var(--border)]" />
        <button className="px-3 py-2 rounded bg-[var(--primary)] text-[var(--primary-foreground)]">Pesquisar</button>
      </form>

      {query && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
              <tr>
                <th className="text-left px-6 py-3">Colaborador</th>
                <th className="text-left px-6 py-3">Cargo</th>
                <th className="text-right px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id} className="border-t border-[var(--border)]">
                  <td className="px-6 py-3 text-[var(--foreground)]">{e.display_name ?? e.id}</td>
                  <td className="px-6 py-3 text-[var(--foreground)]">{e.cargo ?? '-'}</td>
                  <td className="px-6 py-3 text-right">
                    <Link href={`/${locale}/admin/timesheets/employee/${e.id}`} className="px-2 py-1 rounded bg-[var(--muted)] text-[var(--foreground)]">Ver meses</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

