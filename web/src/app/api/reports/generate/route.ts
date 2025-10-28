import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { generateSummaryReport, generateDetailedReport, ReportFilters, TimesheetBasic } from '@/lib/reports/generator';

export async function GET(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const supabase = getServiceSupabase();

    console.log('[REPORTS] User:', { id: user.id, email: user.email, tenant_id: user.tenant_id, role: user.role });

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

    console.log('[REPORTS] Filters:', filters);

    // Check if user has tenant_id
    if (!user.tenant_id) {
      console.error('[REPORTS] User has no tenant_id');
      return NextResponse.json({ error: 'Usuário não possui tenant_id configurado' }, { status: 400 });
    }

    // First, get all employees in the tenant
    const { data: allEmployees, error: empError } = await supabase
      .from('employees')
      .select('id, name, cargo, profile_id')
      .eq('tenant_id', user.tenant_id)
      .order('name');

    if (empError) {
      console.error('[REPORTS] Error fetching employees:', empError);
      return NextResponse.json({ error: empError.message }, { status: 500 });
    }

    console.log('[REPORTS] Found employees:', allEmployees?.length || 0);

    // Get profile names for employees
    const profileIds = allEmployees?.map(e => e.profile_id).filter(Boolean) || [];
    let profileNames: Record<string, string> = {};

    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', profileIds);

      if (profiles) {
        for (const p of profiles) {
          profileNames[p.user_id] = p.display_name || p.email || 'Unknown';
        }
      }
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
        employee:employees(id, name, profile_id),
        entries:timesheet_entries(id, data, tipo, hora_ini, hora_fim, observacao),
        annotations:timesheet_annotations(id, entry_id, field_path, message),
        approvals(id, status, created_at, mensagem)
      `)
      .eq('tenant_id', user.tenant_id);

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
      console.error('[REPORTS] Error fetching timesheets:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[REPORTS] Found timesheets:', timesheets?.length || 0);

    // Normalize employee relation (Supabase join may return an array)
    const normalizedTimesheets: TimesheetBasic[] =
      ((timesheets as unknown) as Array<
        Omit<TimesheetBasic, 'employee'> & { employee?: any }
      > | undefined)?.map((ts) => {
        const emp = Array.isArray(ts.employee) ? ts.employee?.[0] : ts.employee;
        const displayName = emp?.profile_id ? profileNames[emp.profile_id] : (emp?.name || 'Unknown');
        return {
          ...ts,
          employee: {
            id: emp?.id,
            display_name: displayName
          }
        } as TimesheetBasic;
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
      employee: { display_name: profileNames[emp.profile_id] || emp.name || 'Unknown' },
      entries: [],
      annotations: [],
      approvals: []
    }));

    const allTimesheetsData = [...normalizedTimesheets, ...emptyTimesheets];

    // Generate report
    const report = type === 'detailed'
      ? generateDetailedReport(allTimesheetsData, filters)
      : generateSummaryReport(allTimesheetsData, filters);

    console.log('[REPORTS] Report generated successfully');
    return NextResponse.json(report, { status: 200 });
  } catch (err) {
    console.error('[REPORTS] Error generating report:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

