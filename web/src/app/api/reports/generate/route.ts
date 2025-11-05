import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import {
  generateSummaryReport,
  generateDetailedReport,
  generateRoleSpecificReport,
  generateReports,
  generateRoleSpecificReports,
  generateGroupedByEmployeeReport,
  generateGroupedByVesselReport,
  ReportFilters,
  TimesheetBasic
} from '@/lib/reports/generator';
import {
  convertToTenantTimezone,
  calculateTimesheetDeadline,
  isPastDeadline,
  formatTimesheetPeriodDisplay,
  getTimezoneAbbreviation,
  TimezoneType
} from '@/lib/timezone/utils';
import { validateReportParameters, validateReportsAccess, logAccessControl } from '@/lib/access-control';

export async function GET(req: NextRequest) {
  let user: any = null;
  
  try {
    user = await requireApiAuth();
    const supabase = getServiceSupabase();

    console.log('[REPORTS] User:', { id: user.id, email: user.email, tenant_id: user.tenant_id, role: user.role });

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') || 'summary'; // 'summary', 'detailed', 'hours', 'pending'
    const reportScope = searchParams.get('scope') || 'timesheets'; // 'timesheets', 'hours', 'pending'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const employeeIdParam = searchParams.get('employeeId') || undefined;

    // Validate and sanitize input parameters
    const validation = validateReportParameters({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: status || undefined,
      employeeId: employeeIdParam || undefined,
      type: type || undefined,
      scope: reportScope
    });

    if (!validation.valid) {
      console.error('[REPORTS] Parameter validation failed:', validation.error);
      await logAccessControl({
        userId: user.id,
        userRole: user.role,
        action: 'report_generate',
        resource: 'timesheet_reports',
        scope: reportScope,
        success: false,
        details: {
          error: 'parameter_validation_failed',
          invalidParams: validation.error
        }
      });
      return NextResponse.json({ error: `Parâmetros inválidos: ${validation.error}` }, { status: 400 });
    }

    const filters: ReportFilters = {
      startDate: validation.sanitized.startDate,
      endDate: validation.sanitized.endDate,
      status: validation.sanitized.status,
      employeeId: validation.sanitized.employeeId,
      userRole: user.role,
    };

    console.log('[REPORTS] Filters:', filters);

    // Check if user has tenant_id
    if (!user.tenant_id) {
      console.error('[REPORTS] User has no tenant_id');
      return NextResponse.json({ error: 'Usuário não possui tenant_id configurado' }, { status: 400 });
    }

    // Apply hierarchical access control
    const accessResult = await validateReportsAccess(
      user.id,
      user.role,
      user.tenant_id,
      validation.sanitized.employeeId,
      reportScope
    );

    if (!accessResult.allowed) {
      console.error('[REPORTS] Access denied:', accessResult.error);
      
      await logAccessControl({
        userId: user.id,
        userRole: user.role,
        action: 'report_generate',
        resource: 'timesheet_reports',
        scope: reportScope,
        success: false,
        employeeId: validation.sanitized.employeeId,
        details: {
          error: 'access_denied',
          reason: accessResult.error,
          requestedEmployeeId: validation.sanitized.employeeId
        }
      });
      
      return NextResponse.json({ error: accessResult.error }, { status: 403 });
    }

    let employeeId: string | undefined = accessResult.employeeId;
    let allowedEmployeeIds: string[] | undefined = accessResult.allowedEmployeeIds;

    // Update filters with validated employee access
    if (employeeId) {
      filters.employeeId = employeeId;
    }

    // Get tenant timezone with fallback for missing columns
    let tenantTimezone: TimezoneType = 'America/Sao_Paulo';
    
    try {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('timezone')
        .eq('id', user.tenant_id)
        .single();

      if (tenantError && tenantError.code === '42703') {
        // Column doesn't exist yet - use default
        console.warn('[REPORTS] Tenant timezone column missing, using default America/Sao_Paulo');
        tenantTimezone = 'America/Sao_Paulo';
      } else if (tenantError) {
        console.error('[REPORTS] Error fetching tenant timezone:', tenantError);
        return NextResponse.json({ error: 'Erro ao buscar timezone do tenant' }, { status: 500 });
      } else {
        tenantTimezone = tenant?.timezone || 'America/Sao_Paulo';
      }
    } catch (err) {
      console.warn('[REPORTS] Could not fetch tenant timezone, using default:', err);
      tenantTimezone = 'America/Sao_Paulo';
    }
    
    console.log('[REPORTS] Tenant timezone:', tenantTimezone);

    // Build query for timesheets - include vessel information
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
        employee:employees(
          id,
          name,
          profile_id,
          vessel_id,
          vessel:vessels!employees_vessel_id_fkey(id, name, code)
        ),
        entries:timesheet_entries(id, data, tipo, hora_ini, hora_fim, observacao),
        annotations:timesheet_annotations(id, entry_id, field_path, message)
      `)
      .eq('tenant_id', user.tenant_id);

    // Apply filters
    // For date filtering, we need to check if the timesheet period overlaps with the filter range
    // A timesheet overlaps if: periodo_ini <= endDate AND periodo_fim >= startDate
    if (startDate) {
      // Timesheet must end on or after the filter start date
      query = query.gte('periodo_fim', startDate);
    }
    if (endDate) {
      // Timesheet must start on or before the filter end date
      query = query.lte('periodo_ini', endDate);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (employeeId) {
      // Specific employee requested
      query = query.eq('employee_id', employeeId);
    } else if (allowedEmployeeIds && allowedEmployeeIds.length > 0) {
      // Manager: filter by allowed employees only
      query = query.in('employee_id', allowedEmployeeIds);
    }
    // Admin: no employee filter (sees all)

    const { data: timesheets, error } = await query.order('periodo_ini', { ascending: false });

    if (error) {
      console.error('[REPORTS] Error fetching timesheets:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[REPORTS] Found timesheets:', timesheets?.length || 0);

    // Get profile names for employees
    const profileIds = timesheets?.flatMap((ts: any) => 
      (ts.employee && Array.isArray(ts.employee) ? ts.employee[0]?.profile_id : ts.employee?.profile_id) || []
    ).filter(Boolean) || [];
    
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

    // Normalize timesheets data and sort entries by time
    const normalizedTimesheets: TimesheetBasic[] = (timesheets || []).map((ts: any) => {
      const emp = Array.isArray(ts.employee) ? ts.employee?.[0] : ts.employee;
      const displayName = emp?.profile_id ? profileNames[emp.profile_id] : (emp?.name || 'Unknown');

      // Sort entries by date and then by hora_ini
      const sortedEntries = (ts.entries || []).sort((a: any, b: any) => {
        // Sort by date first
        if (a.data !== b.data) return a.data.localeCompare(b.data);
        // Then by hora_ini (entries without time go last)
        const timeA = a.hora_ini || '99:99';
        const timeB = b.hora_ini || '99:99';
        return timeA.localeCompare(timeB);
      });

      return {
        ...ts,
        entries: sortedEntries,
        employee: {
          id: emp?.id,
          display_name: displayName
        }
      };
    });

    // Generate reports based on type and scope
    let report;
    let filteredTimesheets = normalizedTimesheets;

    // Log successful access
    await logAccessControl({
      userId: user.id,
      userRole: user.role,
      action: 'report_generate',
      resource: 'timesheet_reports',
      scope: reportScope,
      success: true,
      employeeId: employeeId,
      details: {
        reportType: type,
        reportScope: reportScope,
        totalTimesheets: normalizedTimesheets.length,
        filteredTimesheets: filteredTimesheets.length,
        dateRange: validation.sanitized.startDate && validation.sanitized.endDate ?
          `${validation.sanitized.startDate} to ${validation.sanitized.endDate}` : 'all',
        statusFilter: validation.sanitized.status || 'all'
      }
    });

    console.log('[REPORTS] Report scope:', reportScope);
    console.log('[REPORTS] Report type:', type);
    console.log('[REPORTS] Total timesheets before filtering:', normalizedTimesheets.length);

    // Apply scope-based filtering
    switch (reportScope) {
      case 'approved':
        // Filter only approved timesheets
        filteredTimesheets = normalizedTimesheets.filter(t =>
          t.status === 'approved' || t.status === 'aprovado'
        );
        console.log('[REPORTS] Approved timesheets:', filteredTimesheets.length);
        break;

      case 'rejected':
        // Filter only rejected timesheets
        filteredTimesheets = normalizedTimesheets.filter(t =>
          t.status === 'rejected' || t.status === 'recusado'
        );
        console.log('[REPORTS] Rejected timesheets:', filteredTimesheets.length);
        break;

      case 'pending':
        // Filter only pending/submitted timesheets
        filteredTimesheets = normalizedTimesheets.filter(t =>
          t.status === 'submitted' || t.status === 'enviado'
        );
        console.log('[REPORTS] Pending timesheets:', filteredTimesheets.length);
        break;

      case 'by-employee':
      case 'by-vessel':
        // These scopes use all timesheets but group differently
        filteredTimesheets = normalizedTimesheets;
        console.log('[REPORTS] Grouping scope, using all timesheets:', filteredTimesheets.length);
        break;

      default:
        // 'timesheets' - use all
        filteredTimesheets = normalizedTimesheets;
        console.log('[REPORTS] Default scope (all timesheets):', filteredTimesheets.length);
    }

    // Generate report based on scope and type
    if (reportScope === 'by-employee') {
      // Generate employee-grouped report
      if (type === 'summary') {
        report = generateGroupedByEmployeeReport(filteredTimesheets, filters);
        report.title = 'Timesheet Report - Grouped by Employee';
      } else {
        // For detailed, use regular detailed report
        const reports = generateReports(filteredTimesheets, filters, user.role);
        report = reports.detailed;
        report.title = 'Timesheet Detailed Report - By Employee';
      }
    } else if (reportScope === 'by-vessel') {
      // Generate vessel-grouped report
      if (type === 'summary') {
        report = generateGroupedByVesselReport(filteredTimesheets, filters);
        report.title = 'Timesheet Report - Grouped by Vessel';
      } else {
        // For detailed, use regular detailed report with vessel info
        const reports = generateReports(filteredTimesheets, filters, user.role);
        report = reports.detailed;
        report.title = 'Timesheet Detailed Report - By Vessel';
      }
    } else {
      // Generate regular reports for all other scopes
      const reports = generateReports(filteredTimesheets, filters, user.role);
      report = reports[type as keyof typeof reports] || reports.summary;

      // Set appropriate title based on scope
      const scopeTitles: Record<string, string> = {
        'timesheets': 'All Timesheets',
        'pending': 'Pending Items',
        'approved': 'Approved Timesheets',
        'rejected': 'Rejected Timesheets'
      };

      const scopeTitle = scopeTitles[reportScope] || 'Timesheets';
      if (type === 'summary') {
        report.title = `Timesheet Summary Report - ${scopeTitle}`;
      } else {
        report.title = `Timesheet Detailed Report - ${scopeTitle}`;
      }
    }

    // Add role-specific context to the report
    if (user.role === 'USER') {
      report.title = `Meus Relatórios - ${report.title}`;
    } else if (user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') {
      report.title = `Relatórios da Equipe - ${report.title}`;
    } else if (user.role === 'ADMIN') {
      report.title = `Relatórios Administrativos - ${report.title}`;
    }

    console.log('[REPORTS] Report generated successfully');
    return NextResponse.json(report, { status: 200 });
  } catch (err) {
    console.error('[REPORTS] Error generating report:', err);
    
    // Log failed report generation
    await logAccessControl({
      userId: user?.id || 'unknown',
      userRole: user?.role || 'unknown',
      action: 'report_generate',
      resource: 'timesheet_reports',
      scope: (new URL(req.url)).searchParams.get('scope') || 'timesheets',
      success: false,
      details: {
        error: 'internal_error',
        message: err instanceof Error ? err.message : 'Unknown error'
      }
    });
    
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}