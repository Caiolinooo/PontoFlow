import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { createClient } from '@supabase/supabase-js';
import { generateSummaryReport, reportToCSV, ReportFilters, TimesheetBasic } from '@/lib/reports/generator';

export async function GET(req: NextRequest) {
  const user = await requireApiAuth();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Get query parameters
  const searchParams = req.nextUrl.searchParams;
  const format = searchParams.get('format') || 'csv'; // 'csv' or 'json'
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
    // Build query
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
        entries:timesheet_entries(id, data, tipo, hora_ini, hora_fim, observacao)
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

    // Generate report
    const report = generateSummaryReport(normalizedTimesheets, filters);

    if (format === 'json') {
      // Return JSON
      return NextResponse.json(report, {
        status: 200,
        headers: {
          'Content-Disposition': `attachment; filename="report-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    } else {
      // Return CSV
      const csv = reportToCSV(report);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

