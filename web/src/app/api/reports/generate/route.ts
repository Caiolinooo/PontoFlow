import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { generateSummaryReport, generateDetailedReport, ReportFilters, TimesheetBasic } from '@/lib/reports/generator';

export async function GET(req: NextRequest) {
  const user = await requireApiAuth();
  const supabase = getServiceSupabase();

  // Get query parameters
  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get('type') || 'summary'; // 'summary' or 'detailed'
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const status = searchParams.get('status');
  const employeeId = searchParams.get('employeeId');

  const filters: ReportFilters = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    status: status || undefined,
    employeeId: employeeId || undefined,
  };

  try {
    // First, get all employees in the tenant
    const { data: allEmployees, error: empError } = await supabase
      .from('employees')
      .select('id, display_name, cargo')
      .eq('tenant_id', (user.tenant_id as string))
      .order('display_name');

    if (empError) {
      return NextResponse.json({ error: empError.message }, { status: 500 });
    }

    // Build query for timesheets
    let query = supabase
      .from('timesheets')
      .select(`
        id,
        employee_id,
        periodo_ini,
        periodo_fim,
        status,
        created_at,
        updated_at,
        employee:employees(id, display_name),
        entries:timesheet_entries(id, data, tipo, hora_ini, hora_fim, observacao),
        annotations:timesheet_annotations(id, entry_id, field_path, message),
        approvals(id, status, created_at, mensagem)
      `)
      .eq('tenant_id', (user.tenant_id as string));

    // Apply filters
    if (startDate) {
      query = query.gte('periodo_ini', startDate);
    }
    if (endDate) {
      query = query.lte('periodo_fim', endDate);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data: timesheets, error } = await query.order('periodo_ini', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Normalize employee relation (Supabase join may return an array)
    const normalizedTimesheets: TimesheetBasic[] =
      ((timesheets as unknown) as Array<
        Omit<TimesheetBasic, 'employee'> & { employee?: TimesheetBasic['employee'] | TimesheetBasic['employee'][] }
      > | undefined)?.map((ts) => {
        const emp = Array.isArray(ts.employee) ? ts.employee?.[0] : ts.employee;
        return { ...ts, employee: emp } as TimesheetBasic;
      }) ?? [];

    // Create timesheets for employees without any (for the report period)
    const employeesWithTimesheets = new Set(normalizedTimesheets.map(ts => ts.employee_id));

    // Filter employees based on employeeId filter if provided
    let filteredEmployees = allEmployees || [];
    if (employeeId) {
      filteredEmployees = filteredEmployees.filter(emp => emp.id === employeeId);
    }

    const employeesWithoutTimesheets = filteredEmployees.filter(emp => !employeesWithTimesheets.has(emp.id));

    // Add empty timesheets for employees without data
    const emptyTimesheets: TimesheetBasic[] = employeesWithoutTimesheets.map(emp => ({
      id: `empty-${emp.id}`,
      employee_id: emp.id,
      periodo_ini: startDate || new Date().toISOString().split('T')[0],
      periodo_fim: endDate || new Date().toISOString().split('T')[0],
      status: 'rascunho',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      employee: { display_name: emp.display_name },
      entries: [],
      annotations: [],
      approvals: []
    }));

    const allTimesheetsData = [...normalizedTimesheets, ...emptyTimesheets];

    // Generate report
    const report = type === 'detailed'
      ? generateDetailedReport(allTimesheetsData, filters)
      : generateSummaryReport(allTimesheetsData, filters);

    return NextResponse.json(report, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

