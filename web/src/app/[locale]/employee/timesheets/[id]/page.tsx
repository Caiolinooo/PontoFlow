import { requireAuth } from '@/lib/auth/server';
import { getServerSupabase, getServiceSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TimesheetCalendar from '@/components/employee/TimesheetCalendar';

export default async function TimesheetByIdPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const user = await requireAuth(locale);

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? getServiceSupabase() : await getServerSupabase();

  // Resolve employee record for current user
  const { data: emp } = await supabase
    .from('employees')
    .select('id, tenant_id')
    .eq('tenant_id', user.tenant_id as string)
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!emp) {
    redirect(`/${locale}/employee/bootstrap`);
  }

  // Load requested timesheet
  const { data: timesheet } = await supabase
    .from('timesheets')
    .select('id, employee_id, status, periodo_ini, periodo_fim')
    .eq('id', id)
    .maybeSingle();

  if (!timesheet) {
    // If timesheet does not exist, go back to main timesheets page
    redirect(`/${locale}/employee/timesheets`);
  }

  // Enforce ownership for employees
  if (timesheet.employee_id !== emp.id) {
    redirect(`/${locale}/employee/timesheets`);
  }

  // Get entries for this timesheet
  const { data: entries } = await supabase
    .from('timesheet_entries')
    .select('*')
    .eq('timesheet_id', timesheet.id)
    .order('data', { ascending: true })
    .order('hora_ini', { ascending: true, nullsFirst: false });

  // Get tenant info (including work_mode)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('work_schedule, work_mode, settings')
    .eq('id', emp.tenant_id)
    .single();

  // Get work schedule for employee (same resolution logic as current page)
  const { data: workScheduleData } = await supabase
    .from('employee_work_schedules')
    .select('work_schedule, days_on, days_off, start_date')
    .eq('employee_id', emp.id)
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
    } as any;
  }

  return (
    <div className="max-w-[1600px] mx-auto px-2 sm:px-4">
      <TimesheetCalendar
        timesheetId={timesheet.id}
        employeeId={emp.id}
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

