import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { reportToCSV } from '@/lib/reports/generator';
import { generateReportPDF } from '@/lib/reports/pdf-generator';
import { generateReportExcel } from '@/lib/reports/excel-generator';
import { validateReportParameters, validateReportsAccess, logAccessControl } from '@/lib/access-control';

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
        annotations:timesheet_annotations(id, entry_id, field_path, message)
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

    // Normalize data structure
    const normalizedTimesheets = timesheets?.map((ts: any) => {
      const emp = Array.isArray(ts.employee) ? ts.employee?.[0] : ts.employee;
      const displayName = emp?.profile_id ? profileNames[emp.profile_id] : (emp?.name || 'Unknown');
      
      return {
        ...ts,
        employee: {
          id: emp?.id,
          display_name: displayName
        }
      };
    }) || [];

    // Generate report data based on type
    let reportData;
    
    if (reportType === 'detailed') {
      // Generate detailed report
      const items = normalizedTimesheets.map(t => ({
        timesheet: {
          id: t.id,
          employeeName: t.employee?.display_name || 'Unknown',
          employeeId: t.employee_id,
          period: `${t.periodo_ini} - ${t.periodo_fim}`,
          status: t.status,
          entryCount: t.entries?.length || 0,
          submittedAt: t.created_at,
        },
        entries: t.entries || [],
        annotations: t.annotations || [],
      }));

      reportData = {
        title: 'Timesheet Detailed Report',
        generatedAt: new Date().toISOString(),
        items,
      };
    } else {
      // Generate summary report
      const summary = {
        totalTimesheets: normalizedTimesheets.length,
        approved: normalizedTimesheets.filter(t => t.status === 'aprovado').length,
        rejected: normalizedTimesheets.filter(t => t.status === 'recusado').length,
        pending: normalizedTimesheets.filter(t => t.status === 'enviado').length,
        draft: normalizedTimesheets.filter(t => t.status === 'rascunho').length,
        locked: normalizedTimesheets.filter(t => t.status === 'bloqueado').length,
      };

      const items = normalizedTimesheets.map(t => ({
        id: t.id,
        employeeName: t.employee?.display_name || 'Unknown',
        employeeId: t.employee_id,
        period: `${t.periodo_ini} - ${t.periodo_fim}`,
        status: t.status,
        entryCount: t.entries?.length || 0,
        submittedAt: t.created_at,
      }));

      reportData = {
        title: 'Timesheet Summary Report',
        generatedAt: new Date().toISOString(),
        summary,
        items,
      };
    }

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