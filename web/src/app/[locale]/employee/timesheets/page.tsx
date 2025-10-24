import { requireAuth } from '@/lib/auth/server';
import { getServerSupabase, getServiceSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TimesheetCalendar from '@/components/employee/TimesheetCalendar';

export default async function TimesheetsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requireAuth(locale);

  // Use service client if available, otherwise server client
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? getServiceSupabase() : await getServerSupabase();

  // Resolve employee record for current user
  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('id, tenant_id')
    .eq('tenant_id', user.tenant_id as string)
    .eq('profile_id', user.id)
    .maybeSingle();

  if (empErr) {
    console.error('Error fetching employee:', empErr);
  }

  // If the profile is not linked to an employee, redirect to bootstrap
  if (!emp) {
    redirect(`/${locale}/employee/bootstrap`);
  }

  // Get or create current month timesheet
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const periodo_ini = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const periodo_fim = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  let { data: timesheet } = await supabase
    .from('timesheets')
    .select('id, status, periodo_ini, periodo_fim')
    .eq('employee_id', emp.id)
    .eq('periodo_ini', periodo_ini)
    .maybeSingle();

  if (!timesheet) {
    // Create timesheet for current month
    const { data: newTimesheet, error: createErr } = await supabase
      .from('timesheets')
      .insert({
        tenant_id: emp.tenant_id,
        employee_id: emp.id,
        periodo_ini,
        periodo_fim,
        status: 'draft',
      })
      .select('id, status, periodo_ini, periodo_fim')
      .single();

    if (createErr) {
      console.error('Error creating timesheet:', createErr);
      return (
        <div className="p-6">
          <div className="bg-red-100 text-red-800 p-4 rounded">
            Erro ao criar timesheet. Por favor, contate o administrador.
          </div>
        </div>
      );
    }

    timesheet = newTimesheet;
  }

  // Get entries for this timesheet
  const { data: entries } = await supabase
    .from('timesheet_entries')
    .select('*')
    .eq('timesheet_id', timesheet.id)
    .order('data', { ascending: true });

  // Get work schedule for employee
  const { data: workScheduleData } = await supabase
    .from('employee_work_schedules')
    .select('work_schedule, days_on, days_off, start_date')
    .eq('employee_id', emp.id)
    .lte('start_date', periodo_ini)
    .or(`end_date.is.null,end_date.gte.${periodo_ini}`)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  // If no employee-specific schedule, get tenant default
  let workSchedule = workScheduleData;
  if (!workSchedule) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('work_schedule')
      .eq('id', emp.tenant_id)
      .single();

    if (tenant?.work_schedule) {
      workSchedule = {
        work_schedule: tenant.work_schedule,
        days_on: null,
        days_off: null,
        start_date: periodo_ini,
      };
    }
  }

  return (
    <TimesheetCalendar
      timesheetId={timesheet.id}
      employeeId={emp.id}
      periodo_ini={timesheet.periodo_ini}
      periodo_fim={timesheet.periodo_fim}
      status={timesheet.status}
      initialEntries={entries ?? []}
      locale={locale}
      workSchedule={workSchedule}
    />
  );
}

