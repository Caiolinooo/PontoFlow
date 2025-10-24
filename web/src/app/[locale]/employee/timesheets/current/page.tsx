import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getEffectivePeriodLock } from '@/lib/periods/resolver';

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default async function CurrentTimesheetPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requireAuth(locale);

  const supabase = await getServerSupabase();
  // Resolve employee id
  const { data: emp } = await supabase
    .from('employees')
    .select('id, tenant_id')
    .eq('profile_id', user.id)
    .eq('tenant_id', user.tenant_id as string)
    .maybeSingle();

  if (!emp) {
    // If no employee record, send to list/new as fallback
    redirect(`/${locale}/employee/timesheets`);
  }

  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth()+1, 0);
  const periodo_ini = toISODate(first);
  const periodo_fim = toISODate(last);

  // Try to find existing current month timesheet
  const { data: existing } = await supabase
    .from('timesheets')
    .select('id')
    .eq('employee_id', emp!.id)
    .eq('periodo_ini', periodo_ini)
    .maybeSingle();

  let tsId = existing?.id as string | undefined;

  if (!tsId) {
    // Check effective lock (hierarchy)
    const monthKey = `${first.getFullYear()}-${String(first.getMonth()+1).padStart(2,'0')}-01`;
    const eff = await getEffectivePeriodLock(supabase, emp!.tenant_id, emp!.id, monthKey);

    if (eff.locked) {
      // Cannot create; fallback to list
      redirect(`/${locale}/employee/timesheets`);
    }

    const ins = await supabase
      .from('timesheets')
      .insert({
        tenant_id: emp!.tenant_id,
        employee_id: emp!.id,
        periodo_ini,
        periodo_fim,
        status: 'rascunho'
      })
      .select('id')
      .single();

    tsId = ins.data?.id;
    if (!tsId) {
      redirect(`/${locale}/employee/timesheets`);
    }
  }

  redirect(`/${locale}/employee/timesheets/${tsId}`);
}

