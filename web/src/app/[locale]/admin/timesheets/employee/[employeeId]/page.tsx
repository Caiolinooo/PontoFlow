import { requireRole } from '@/lib/auth/server';
import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';

function ym(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }

export default async function AdminEmployeeTimesheets({ params, searchParams }: { params: Promise<{ locale: string; employeeId: string }>; searchParams: Promise<{ m?: string }> }) {
  const { locale, employeeId } = await params;
  const { m } = await searchParams;
  await requireRole(locale, ['ADMIN']);

  const supabase = await getServerSupabase();
  // Buscar colaborador
  const { data: emp } = await supabase
    .from('employees')
    .select('id, display_name, profile_id')
    .eq('id', employeeId)
    .single();

  // Listar timesheets do colaborador
  const { data: sheets } = await supabase
    .from('timesheets')
    .select('id, periodo_ini, periodo_fim, status')
    .eq('employee_id', employeeId)
    .order('periodo_ini', { ascending: false })
    .limit(24);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">{emp?.display_name ?? 'Colaborador'}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Selecione um mês para abrir o editor.</p>
        </div>
        <Link href={`/${locale}/admin/timesheets`} className="text-sm underline">Voltar</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(sheets ?? []).map((s) => (
          <Link key={s.id} href={`/${locale}/admin/timesheets/view/${s.id}`} className="block border border-[var(--border)] rounded-xl p-4 bg-[var(--card)] hover:shadow">
            <div className="font-medium text-[var(--foreground)]">{new Date(s.periodo_ini).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</div>
            <div className="text-xs text-[var(--muted-foreground)]">{s.periodo_ini} – {s.periodo_fim}</div>
            <div className="mt-2 text-xs">Status: <span className="font-medium">{s.status}</span></div>
          </Link>
        ))}
      </div>
    </div>
  );
}

