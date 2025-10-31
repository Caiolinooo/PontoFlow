import { requireRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import TimesheetCalendar from '@/components/employee/TimesheetCalendar';
import { redirect } from 'next/navigation';

export default async function AdminTimesheetView({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  await requireRole(locale, ['ADMIN']);

  const supabase = getServiceSupabase();

  // Get timesheet
  const { data: timesheet, error: tsError } = await supabase
    .from('timesheets')
    .select('*, employees!inner(id, tenant_id)')
    .eq('id', id)
    .single();

  if (tsError || !timesheet) {
    redirect(`/${locale}/admin/timesheets`);
  }

  // Get entries
  const { data: entries } = await supabase
    .from('timesheet_entries')
    .select('*')
    .eq('timesheet_id', id)
    .order('data', { ascending: true });

  // Get tenant info (including work_mode)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('work_schedule, work_mode, settings')
    .eq('id', timesheet.employees.tenant_id)
    .single();

  // Get work schedule
  const { data: workScheduleData } = await supabase
    .from('employee_work_schedules')
    .select('work_schedule, days_on, days_off, start_date')
    .eq('employee_id', timesheet.employee_id)
    .lte('start_date', timesheet.periodo_ini)
    .or(`end_date.is.null,end_date.gte.${timesheet.periodo_ini}`)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  let workSchedule = workScheduleData;
  if (!workSchedule && tenant?.work_schedule) {
    workSchedule = {
      work_schedule: tenant.work_schedule,
      days_on: null,
      days_off: null,
      start_date: timesheet.periodo_ini,
    };
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 p-4 rounded-lg">
        <p className="font-semibold">⚠️ Modo Administrador</p>
        <p className="text-sm">Você está visualizando este timesheet como administrador. Todas as edições serão registradas.</p>
      </div>

      <TimesheetCalendar
        timesheetId={timesheet.id}
        employeeId={timesheet.employee_id}
        periodo_ini={timesheet.periodo_ini}
        periodo_fim={timesheet.periodo_fim}
        status={timesheet.status}
        initialEntries={entries ?? []}
        locale={locale}
        workSchedule={workSchedule}
        tenantWorkMode={tenant?.work_mode || 'standard'}
      />
    </div>
  );
}

