import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import {
  reportToCSV,
  generateReports,
  generateGroupedByEmployeeReport,
  generateGroupedByVesselReport,
  ReportFilters,
  TimesheetBasic,
  WorkModeConfig
} from '@/lib/reports/generator';
import { generateReportPDF } from '@/lib/reports/pdf-generator';
import { generateReportExcel } from '@/lib/reports/excel-generator';
import { validateReportParameters, validateReportsAccess, logAccessControl } from '@/lib/access-control';
import { TimezoneType } from '@/lib/timezone/utils';

export async function GET(req: NextRequest) {
  let user: any = null;
  
  try {
    user = await requireApiAuth();
    const supabase = getServiceSupabase();

    console.log('[REPORTS-EXPORT] User:', { id: user.id, email: user.email, tenant_id: user.tenant_id, role: user.role });

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');
    const reportType = searchParams.get('type') || 'summary';
    const locale = (searchParams.get('locale') || 'pt-BR') as 'pt-BR' | 'en-GB';
    const reportScope = searchParams.get('scope') || 'timesheets';

    // Check if user has tenant_id
    if (!user.tenant_id) {
      console.error('[REPORTS-EXPORT] User has no tenant_id');
      return NextResponse.json({ error: 'Usuário não possui tenant_id configurado' }, { status: 400 });
    }

    // Validate and sanitize input parameters
    const validation = validateReportParameters({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: status || undefined,
      employeeId: employeeId || undefined,
      type: reportType,
      scope: reportScope,
      format: format
    });

    if (!validation.valid) {
      console.error('[REPORTS-EXPORT] Parameter validation failed:', validation.error);
      
      await logAccessControl({
        userId: user.id,
        userRole: user.role,
        action: 'report_export',
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

    // Apply hierarchical access control
    const accessResult = await validateReportsAccess(
      user.id,
      user.role,
      user.tenant_id,
      validation.sanitized.employeeId,
      reportScope
    );

    if (!accessResult.allowed) {
      console.error('[REPORTS-EXPORT] Access denied:', accessResult.error);
      
      await logAccessControl({
        userId: user.id,
        userRole: user.role,
        action: 'report_export',
        resource: 'timesheet_reports',
        scope: reportScope,
        success: false,
        employeeId: validation.sanitized.employeeId,
        details: {
          error: 'access_denied',
          reason: accessResult.error,
          requestedEmployeeId: validation.sanitized.employeeId,
          exportFormat: format
        }
      });
      
      return NextResponse.json({ error: accessResult.error }, { status: 403 });
    }

    let allowedEmployeeIds: string[] | undefined = accessResult.allowedEmployeeIds;
    let requestedEmployeeId: string | undefined = accessResult.employeeId;

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

    // Apply filters - use same logic as generate endpoint
    // For date filtering, check if timesheet period overlaps with filter range
    if (startDate) {
      query = query.gte('periodo_fim', startDate);
    }
    if (endDate) {
      query = query.lte('periodo_ini', endDate);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (requestedEmployeeId) {
      // Specific employee requested
      query = query.eq('employee_id', requestedEmployeeId);
    } else if (allowedEmployeeIds && allowedEmployeeIds.length > 0) {
      // Manager: filter by allowed employees only
      query = query.in('employee_id', allowedEmployeeIds);
    }
    // Admin: no employee filter (sees all)

    const { data: timesheets, error } = await query.order('periodo_ini', { ascending: false });

    if (error) {
      console.error('[REPORTS-EXPORT] Error fetching timesheets:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[REPORTS-EXPORT] Found timesheets:', timesheets?.length || 0);

    // Get tenant work_mode for hours calculation
    let tenantWorkMode: 'standard' | 'offshore' = 'standard';

    try {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('work_mode')
        .eq('id', user.tenant_id)
        .single();

      if (tenantError && tenantError.code === '42703') {
        console.warn('[REPORTS-EXPORT] Tenant work_mode column missing, using default standard');
        tenantWorkMode = 'standard';
      } else if (tenantError) {
        console.warn('[REPORTS-EXPORT] Error fetching tenant work_mode, using default:', tenantError);
        tenantWorkMode = 'standard';
      } else {
        tenantWorkMode = (tenant?.work_mode as 'standard' | 'offshore') || 'standard';
      }
    } catch (err) {
      console.warn('[REPORTS-EXPORT] Could not fetch tenant work_mode, using default:', err);
      tenantWorkMode = 'standard';
    }

    // Create work mode configuration for hours calculation
    const workModeConfig: WorkModeConfig = tenantWorkMode === 'offshore'
      ? { mode: 'offshore' }
      : {
          mode: 'standard',
          breakRules: {
            minHoursForBreak: 6,
            breakDuration: 60  // 1 hour in minutes
          }
        };

    console.log('[REPORTS-EXPORT] Work mode config:', workModeConfig);

    // Get profile names for employees
    const profileIds = timesheets?.flatMap(ts =>
      (ts.employee && Array.isArray(ts.employee) ? (ts.employee as any)[0]?.profile_id : (ts.employee as any)?.profile_id) || []
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

    // Normalize timesheets data and sort entries by time (same as generate endpoint)
    const normalizedTimesheets: TimesheetBasic[] = (timesheets || []).map((ts: any) => {
      const emp = Array.isArray(ts.employee) ? ts.employee?.[0] : ts.employee;
      const displayName = emp?.profile_id ? profileNames[emp.profile_id] : (emp?.name || 'Unknown');

      // Sort entries by date and then by hora_ini
      const sortedEntries = (ts.entries || []).sort((a: any, b: any) => {
        if (a.data !== b.data) return a.data.localeCompare(b.data);
        const timeA = a.hora_ini || '99:99';
        const timeB = b.hora_ini || '99:99';
        return timeA.localeCompare(timeB);
      });

      return {
        ...ts,
        entries: sortedEntries,
        employee: {
          id: emp?.id,
          display_name: displayName,
          vessel_id: emp?.vessel_id,
          vessel: emp?.vessel ? {
            id: emp.vessel.id,
            name: emp.vessel.name,
            code: emp.vessel.code
          } : undefined
        }
      };
    });

    // Apply scope-based filtering (same as generate endpoint)
    let filteredTimesheets = [...normalizedTimesheets];

    console.log('[REPORTS-EXPORT] Report scope:', reportScope);
    console.log('[REPORTS-EXPORT] Total timesheets before filtering:', normalizedTimesheets.length);

    switch (reportScope) {
      case 'approved':
        filteredTimesheets = filteredTimesheets.filter(t =>
          t.status === 'approved' || t.status === 'aprovado'
        );
        console.log('[REPORTS-EXPORT] Approved timesheets:', filteredTimesheets.length);
        break;

      case 'rejected':
        filteredTimesheets = filteredTimesheets.filter(t =>
          t.status === 'rejected' || t.status === 'recusado'
        );
        console.log('[REPORTS-EXPORT] Rejected timesheets:', filteredTimesheets.length);
        break;

      case 'pending':
        filteredTimesheets = filteredTimesheets.filter(t =>
          t.status === 'submitted' || t.status === 'enviado'
        );
        console.log('[REPORTS-EXPORT] Pending timesheets:', filteredTimesheets.length);
        break;

      case 'by-employee':
      case 'by-vessel':
        console.log('[REPORTS-EXPORT] Grouping scope, using all timesheets:', filteredTimesheets.length);
        break;

      default:
        console.log('[REPORTS-EXPORT] Default scope (all timesheets):', filteredTimesheets.length);
    }

    const filters: ReportFilters = {
      startDate: validation.sanitized.startDate,
      endDate: validation.sanitized.endDate,
      status: validation.sanitized.status,
      employeeId: validation.sanitized.employeeId,
      userRole: user.role,
    };

    // Generate report using same functions as generate endpoint
    let reportData;

    if (reportScope === 'by-employee') {
      // Generate employee-grouped report
      if (reportType === 'summary') {
        reportData = generateGroupedByEmployeeReport(filteredTimesheets, filters, workModeConfig);
        reportData.title = 'Timesheet Report - Grouped by Employee';
      } else {
        const reports = generateReports(filteredTimesheets, filters, user.role, workModeConfig);
        reportData = reports.detailed;
        reportData.title = 'Timesheet Detailed Report - By Employee';
      }
    } else if (reportScope === 'by-vessel') {
      // Generate vessel-grouped report
      if (reportType === 'summary') {
        reportData = generateGroupedByVesselReport(filteredTimesheets, filters, workModeConfig);
        reportData.title = 'Timesheet Report - Grouped by Vessel';
      } else {
        const reports = generateReports(filteredTimesheets, filters, user.role, workModeConfig);
        reportData = reports.detailed;
        reportData.title = 'Timesheet Detailed Report - By Vessel';
      }
    } else {
      // Generate regular reports for all other scopes
      const reports = generateReports(filteredTimesheets, filters, user.role, workModeConfig);
      reportData = reports[reportType as keyof typeof reports] || reports.summary;

      // Set appropriate title based on scope
      const scopeTitles: Record<string, string> = {
        'timesheets': 'All Timesheets',
        'pending': 'Pending Items',
        'approved': 'Approved Timesheets',
        'rejected': 'Rejected Timesheets'
      };

      const scopeTitle = scopeTitles[reportScope] || 'Timesheets';
      if (reportType === 'summary') {
        reportData.title = `Timesheet Summary Report - ${scopeTitle}`;
      } else {
        reportData.title = `Timesheet Detailed Report - ${scopeTitle}`;
      }
    }

    // Add role-specific context to the report
    if (user.role === 'USER') {
      reportData.title = `Meus Relatórios - ${reportData.title}`;
    } else if (user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') {
      reportData.title = `Relatórios da Equipe - ${reportData.title}`;
    } else if (user.role === 'ADMIN') {
      reportData.title = `Relatórios Administrativos - ${reportData.title}`;
    }

    console.log('[REPORTS-EXPORT] Report generated successfully with work mode:', tenantWorkMode);

    // Get tenant settings for branding
    const { data: tenantSettings } = await supabase
      .from('tenant_settings')
      .select('company_name, logo_url, watermark_text, company_legal_name, company_document, address_line1, city, state')
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    const exportOptions = {
      companyName: tenantSettings?.company_name || tenantSettings?.company_legal_name || 'PontoFlow',
      companyLogo: tenantSettings?.logo_url || '',
      watermarkText: tenantSettings?.watermark_text || '',
      companyDocument: tenantSettings?.company_document || '',
      companyAddress: tenantSettings?.address_line1
        ? `${tenantSettings.address_line1}, ${tenantSettings.city || ''} - ${tenantSettings.state || ''}`
        : '',
      employeeName: employeeId ? normalizedTimesheets.find(t => t.employee_id === employeeId)?.employee?.display_name : '',
      employeeId: employeeId || '',
      locale,
    };

    // Log successful export
    await logAccessControl({
      userId: user.id,
      userRole: user.role,
      action: 'report_export',
      resource: 'timesheet_reports',
      scope: reportScope,
      success: true,
      employeeId: requestedEmployeeId,
      details: {
        reportType: reportType,
        exportFormat: format,
        totalTimesheets: normalizedTimesheets.length,
        employeeId: requestedEmployeeId,
        dateRange: validation.sanitized.startDate && validation.sanitized.endDate ?
          `${validation.sanitized.startDate} to ${validation.sanitized.endDate}` : 'all',
        statusFilter: validation.sanitized.status || 'all'
      }
    });

    // Format and return based on requested format
    if (format === 'csv') {
      const csv = reportToCSV(reportData as any);

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else if (format === 'json') {
      return NextResponse.json(reportData, {
        headers: {
          'Content-Disposition': `attachment; filename="report-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    } else if (format === 'pdf') {
      // Generate PDF with company branding
      const pdfBuffer = await generateReportPDF(reportData as any, exportOptions);

      return new Response(pdfBuffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="report-${new Date().toISOString().split('T')[0]}.pdf"`,
        },
      });
    } else if (format === 'excel') {
      // Generate Excel with company branding
      const excelBuffer = await generateReportExcel(reportData as any, exportOptions);

      return new Response(excelBuffer as any, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="report-${new Date().toISOString().split('T')[0]}.xlsx"`,
        },
      });
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }
  } catch (err) {
    console.error('[REPORTS-EXPORT] Error exporting report:', err);
    
    // Log failed export
    await logAccessControl({
      userId: user?.id || 'unknown',
      userRole: user?.role || 'unknown',
      action: 'report_export',
      resource: 'timesheet_reports',
      scope: (new URL(req.url)).searchParams.get('scope') || 'timesheets',
      success: false,
      details: {
        error: 'internal_error',
        message: err instanceof Error ? err.message : 'Unknown error',
        exportFormat: (new URL(req.url)).searchParams.get('format')
      }
    });
    
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}