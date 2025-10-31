/**
 * Report Generation Logic
 * Generates summary and detailed reports from timesheet data
 * Enhanced with hour calculations and role-based access control
 */

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  employeeId?: string;
  groupId?: string;
  userRole?: string; // 'ADMIN', 'GERENTE', 'COLABORADOR'
}

export interface ReportEntry {
  id: string;
  employeeName: string;
  employeeId: string;
  vesselName?: string;
  vesselCode?: string;
  vesselId?: string;
  period: string;
  status: string;
  entryCount: number;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  totalHours?: number;
  totalMinutes?: number;
}

export interface SummaryReport {
  title: string;
  generatedAt: string;
  filters: ReportFilters;
  summary: {
    totalTimesheets: number;
    approved: number;
    rejected: number;
    pending: number;
    draft: number;
    locked: number;
    totalHours: number;
    averageHours: number;
  };
  items: ReportEntry[];
  groupBy?: string; // Optional grouping field (employee, vessel, environment)
}

export interface DetailedReport {
  title: string;
  generatedAt: string;
  filters: ReportFilters;
  items: Array<{
    timesheet: ReportEntry;
    entries: Array<{
      id: string;
      data: string;
      tipo: string;
      hora_ini?: string;
      hora_fim?: string;
      observacao?: string;
      duration?: number; // Duration in hours
    }>;
    annotations: Array<{
      id: string;
      entry_id?: string;
      field_path?: string;
      message: string;
    }>;
    approvals: Array<{
      id: string;
      status: string;
      created_at: string;
      mensagem?: string;
    }>;
  }>;
  groupBy?: string; // Optional grouping field (employee, vessel, environment)
}

export interface TimesheetBasic {
  id: string;
  employee_id: string;
  employee?: {
    display_name?: string;
    hourly_rate?: number;
    vessel_id?: string;
    vessel?: {
      id: string;
      name: string;
      code?: string;
    };
  };
  periodo_ini: string;
  periodo_fim: string;
  status: string;
  entries?: Array<{
    id: string;
    data: string;
    tipo: string;
    hora_ini?: string;
    hora_fim?: string;
    observacao?: string;
  }>;
  annotations?: Array<{
    id: string;
    entry_id?: string;
    field_path?: string;
    message: string;
  }>;
  approvals?: Array<{
    id: string;
    status: string;
    created_at: string;
    mensagem?: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Calculate total hours from timesheet entries
 */
export function calculateTotalHours(entries: Array<{ hora_ini?: string; hora_fim?: string }>): number {
  if (!entries || entries.length === 0) return 0;
  
  let totalMinutes = 0;
  
  for (const entry of entries) {
    if (!entry.hora_ini || !entry.hora_fim) continue;
    
    try {
      const [startHour, startMin] = entry.hora_ini.split(':').map(Number);
      const [endHour, endMin] = entry.hora_fim.split(':').map(Number);
      
      const startTotalMinutes = startHour * 60 + startMin;
      let endTotalMinutes = endHour * 60 + endMin;
      
      // Handle overnight shifts (end time next day)
      if (endTotalMinutes <= startTotalMinutes) {
        endTotalMinutes += 24 * 60;
      }
      
      const durationMinutes = endTotalMinutes - startTotalMinutes;
      totalMinutes += Math.max(0, durationMinutes);
    } catch (error) {
      console.warn('Error parsing time entries:', error);
      continue;
    }
  }
  
  return Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate duration for a single entry in hours
 */
function calculateEntryDuration(entry: { hora_ini?: string; hora_fim?: string }): number {
  if (!entry.hora_ini || !entry.hora_fim) return 0;
  
  try {
    const [startHour, startMin] = entry.hora_ini.split(':').map(Number);
    const [endHour, endMin] = entry.hora_fim.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMin;
    let endTotalMinutes = endHour * 60 + endMin;
    
    // Handle overnight shifts
    if (endTotalMinutes <= startTotalMinutes) {
      endTotalMinutes += 24 * 60;
    }
    
    const durationMinutes = endTotalMinutes - startTotalMinutes;
    return Math.round((durationMinutes / 60) * 100) / 100;
  } catch (error) {
    console.warn('Error calculating entry duration:', error);
    return 0;
  }
}

/**
 * Generate role-specific summary report
 */
export function generateRoleSpecificReport(
  timesheets: TimesheetBasic[],
  filters: ReportFilters,
  userRole: string
): SummaryReport {
  let filteredTimesheets = [...timesheets];
  
  // Apply role-based filtering
  if (userRole === 'COLABORADOR') {
    // Collaborator can only see their own timesheets
    // This should be handled at the API level, but we can add extra safety
    if (filters.employeeId) {
      filteredTimesheets = timesheets.filter(t => t.employee_id === filters.employeeId);
    } else {
      // If no specific employee filter, return empty (collaborator should only see their own)
      filteredTimesheets = [];
    }
  }
  // Managers can see their team (already filtered by API)
  // Admins can see everything (already handled by API)
  
  return generateSummaryReport(filteredTimesheets, filters);
}

/**
 * Generate summary report with hour calculations
 */
export function generateSummaryReport(
  timesheets: TimesheetBasic[],
  filters: ReportFilters
): SummaryReport {
  const items: ReportEntry[] = timesheets.map(t => {
    const entries = t.entries || [];
    const totalHours = calculateTotalHours(entries);
    const totalMinutes = totalHours * 60;

    return {
      id: t.id,
      employeeName: t.employee?.display_name || 'Unknown',
      employeeId: t.employee_id,
      vesselName: t.employee?.vessel?.name,
      vesselCode: t.employee?.vessel?.code,
      vesselId: t.employee?.vessel_id,
      period: `${t.periodo_ini} - ${t.periodo_fim}`,
      status: t.status,
      entryCount: entries.length,
      submittedAt: t.created_at,
      approvedAt: t.updated_at,
      totalHours,
      totalMinutes
    };
  });

  const totalHours = items.reduce((sum, item) => sum + (item.totalHours || 0), 0);
  const averageHours = timesheets.length > 0 ? Math.round((totalHours / timesheets.length) * 100) / 100 : 0;

  // Helper function to check status (supports both English and Portuguese)
  const isStatus = (status: string, ...values: string[]) => {
    const statusLower = status.toLowerCase();
    return values.some(v => statusLower === v.toLowerCase());
  };

  const summary = {
    totalTimesheets: timesheets.length,
    approved: timesheets.filter(t => isStatus(t.status, 'aprovado', 'approved')).length,
    rejected: timesheets.filter(t => isStatus(t.status, 'recusado', 'rejected')).length,
    pending: timesheets.filter(t => isStatus(t.status, 'enviado', 'submitted')).length,
    draft: timesheets.filter(t => isStatus(t.status, 'rascunho', 'draft')).length,
    locked: timesheets.filter(t => isStatus(t.status, 'bloqueado', 'locked')).length,
    totalHours,
    averageHours
  };

  return {
    title: 'Timesheet Summary Report',
    generatedAt: new Date().toISOString(),
    filters,
    summary,
    items,
  };
}

/**
 * Generate detailed report with hour calculations
 */
export function generateDetailedReport(
  timesheets: TimesheetBasic[],
  filters: ReportFilters
): DetailedReport {
  const items = timesheets.map(t => {
    const entries = t.entries || [];
    const totalHours = calculateTotalHours(entries);

    return {
      timesheet: {
        id: t.id,
        employeeName: t.employee?.display_name || 'Unknown',
        employeeId: t.employee_id,
        vesselName: t.employee?.vessel?.name,
        vesselCode: t.employee?.vessel?.code,
        vesselId: t.employee?.vessel_id,
        period: `${t.periodo_ini} - ${t.periodo_fim}`,
        status: t.status,
        entryCount: entries.length,
        submittedAt: t.created_at,
        totalHours
      },
      entries: entries.map(entry => ({
        ...entry,
        duration: calculateEntryDuration(entry)
      })),
      annotations: t.annotations || [],
      approvals: t.approvals || [],
    };
  });

  return {
    title: 'Timesheet Detailed Report',
    generatedAt: new Date().toISOString(),
    filters,
    items,
  };
}

/**
 * Generate reports based on user role and report type
 */
export function generateReports(
  timesheets: TimesheetBasic[],
  filters: ReportFilters,
  userRole: string
): { summary: SummaryReport; detailed: DetailedReport } {
  // Apply role-based filtering for collaborator
  let filteredTimesheets = timesheets;
  
  if (userRole === 'COLABORADOR') {
    if (filters.employeeId) {
      filteredTimesheets = timesheets.filter(t => t.employee_id === filters.employeeId);
    } else {
      filteredTimesheets = [];
    }
  }
  
  return {
    summary: generateSummaryReport(filteredTimesheets, filters),
    detailed: generateDetailedReport(filteredTimesheets, filters)
  };
}

/**
 * Convert report to CSV format with enhanced data
 */
export function reportToCSV(report: SummaryReport | DetailedReport): string {
  if ('summary' in report) {
    // Summary report with hours
    const headers = ['Employee', 'Period', 'Status', 'Entries', 'Total Hours', 'Submitted At'];
    const rows = report.items.map(item => [
      item.employeeName,
      item.period,
      item.status,
      item.entryCount.toString(),
      (item.totalHours || 0).toFixed(2),
      item.submittedAt || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  } else {
    // Detailed report with entry durations
    const headers = ['Employee', 'Period', 'Status', 'Date', 'Type', 'Start', 'End', 'Duration (hrs)', 'Note'];
    const rows: string[][] = [];

    for (const item of report.items) {
      if (item.entries.length === 0) {
        rows.push([
          item.timesheet.employeeName,
          item.timesheet.period,
          item.timesheet.status,
          '',
          '',
          '',
          '',
          '',
          '',
        ]);
      } else {
        for (const entry of item.entries) {
          rows.push([
            item.timesheet.employeeName,
            item.timesheet.period,
            item.timesheet.status,
            entry.data,
            entry.tipo,
            entry.hora_ini || '',
            entry.hora_fim || '',
            (entry.duration || 0).toFixed(2),
            entry.observacao || '',
          ]);
        }
      }
    }

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  }
}

/**
 * Generate grouped report by employee
 */
export function generateGroupedByEmployeeReport(
  timesheets: TimesheetBasic[],
  filters: ReportFilters
): SummaryReport {
  const report = generateSummaryReport(timesheets, filters);

  // Group items by employee
  const employeeGroups = new Map<string, ReportEntry[]>();

  for (const item of report.items) {
    const key = item.employeeId;
    if (!employeeGroups.has(key)) {
      employeeGroups.set(key, []);
    }
    employeeGroups.get(key)!.push(item);
  }

  // Create summary items per employee
  const groupedItems: ReportEntry[] = [];

  for (const [employeeId, items] of employeeGroups) {
    const totalHours = items.reduce((sum, item) => sum + (item.totalHours || 0), 0);
    const totalMinutes = totalHours * 60;

    groupedItems.push({
      id: `employee-${employeeId}`,
      employeeName: items[0].employeeName,
      employeeId,
      period: `${items.length} timesheet(s)`,
      status: 'grouped',
      entryCount: items.reduce((sum, item) => sum + item.entryCount, 0),
      totalHours,
      totalMinutes
    });
  }

  return {
    ...report,
    title: 'Timesheet Report - Grouped by Employee',
    items: groupedItems.sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
    groupBy: 'employee'
  };
}

/**
 * Generate grouped report by vessel
 */
export function generateGroupedByVesselReport(
  timesheets: TimesheetBasic[],
  filters: ReportFilters
): SummaryReport {
  const report = generateSummaryReport(timesheets, filters);

  // Group items by vessel
  const vesselGroups = new Map<string, ReportEntry[]>();

  for (const item of report.items) {
    // Use vessel ID as key, or 'no-vessel' for employees without vessel
    const key = item.vesselId || 'no-vessel';
    if (!vesselGroups.has(key)) {
      vesselGroups.set(key, []);
    }
    vesselGroups.get(key)!.push(item);
  }

  // Create summary items per vessel
  const groupedItems: ReportEntry[] = [];

  for (const [vesselId, items] of vesselGroups) {
    const totalHours = items.reduce((sum, item) => sum + (item.totalHours || 0), 0);
    const totalMinutes = totalHours * 60;
    const employeeCount = new Set(items.map(item => item.employeeId)).size;

    groupedItems.push({
      id: `vessel-${vesselId}`,
      employeeName: vesselId === 'no-vessel'
        ? 'No Vessel Assigned'
        : `${employeeCount} employee(s)`,
      employeeId: vesselId,
      vesselName: items[0].vesselName || 'No Vessel',
      vesselCode: items[0].vesselCode,
      vesselId: vesselId === 'no-vessel' ? undefined : vesselId,
      period: `${items.length} timesheet(s)`,
      status: 'grouped',
      entryCount: items.reduce((sum, item) => sum + item.entryCount, 0),
      totalHours,
      totalMinutes
    });
  }

  return {
    ...report,
    title: 'Timesheet Report - Grouped by Vessel',
    items: groupedItems.sort((a, b) => (a.vesselName || '').localeCompare(b.vesselName || '')),
    groupBy: 'vessel'
  };
}

/**
 * Generate different report types for different user roles
 */
export function generateRoleSpecificReports(
  timesheets: TimesheetBasic[],
  filters: ReportFilters,
  userRole: string
): {
  timesheets: { summary: SummaryReport; detailed: DetailedReport };
  hours: { summary: SummaryReport; detailed: DetailedReport };
  pending: { summary: SummaryReport; detailed: DetailedReport };
} {
  // Base reports
  const reports = generateReports(timesheets, filters, userRole);

  // Filter for different report types
  const pendingOnly = timesheets.filter(t => t.status === 'enviado' || t.status === 'submitted');
  const hoursOnly = timesheets.filter(t => calculateTotalHours(t.entries || []) > 0);
  
  return {
    timesheets: reports,
    hours: generateReports(hoursOnly, filters, userRole),
    pending: generateReports(pendingOnly, filters, userRole)
  };
}