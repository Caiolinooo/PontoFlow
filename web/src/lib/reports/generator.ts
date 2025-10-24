/**
 * Report Generation Logic
 * Generates summary and detailed reports from timesheet data
 */

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  employeeId?: string;
  groupId?: string;
}

export interface ReportEntry {
  id: string;
  employeeName: string;
  employeeId: string;
  period: string;
  status: string;
  entryCount: number;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  totalHours?: number;
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
  };
  items: ReportEntry[];
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
}
export interface TimesheetBasic {
  id: string;
  employee_id: string;
  employee?: { display_name?: string; hourly_rate?: number };
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
 * Generate summary report
 */
export function generateSummaryReport(
  timesheets: TimesheetBasic[],
  filters: ReportFilters
): SummaryReport {
  const summary = {
    totalTimesheets: timesheets.length,
    approved: timesheets.filter(t => t.status === 'aprovado').length,
    rejected: timesheets.filter(t => t.status === 'recusado').length,
    pending: timesheets.filter(t => t.status === 'enviado').length,
    draft: timesheets.filter(t => t.status === 'rascunho').length,
    locked: timesheets.filter(t => t.status === 'bloqueado').length,
  };

  const items: ReportEntry[] = timesheets.map(t => ({
    id: t.id,
    employeeName: t.employee?.display_name || 'Unknown',
    employeeId: t.employee_id,
    period: `${t.periodo_ini} - ${t.periodo_fim}`,
    status: t.status,
    entryCount: t.entries?.length || 0,
    submittedAt: t.created_at,
    approvedAt: t.updated_at,
  }));

  return {
    title: 'Timesheet Summary Report',
    generatedAt: new Date().toISOString(),
    filters,
    summary,
    items,
  };
}

/**
 * Generate detailed report
 */
export function generateDetailedReport(
  timesheets: TimesheetBasic[],
  filters: ReportFilters
): DetailedReport {
  const items = timesheets.map(t => ({
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
    approvals: t.approvals || [],
  }));

  return {
    title: 'Timesheet Detailed Report',
    generatedAt: new Date().toISOString(),
    filters,
    items,
  };
}

/**
 * Convert report to CSV format
 */
export function reportToCSV(report: SummaryReport | DetailedReport): string {
  if ('summary' in report) {
    // Summary report
    const headers = ['Employee', 'Period', 'Status', 'Entries', 'Submitted At'];
    const rows = report.items.map(item => [
      item.employeeName,
      item.period,
      item.status,
      item.entryCount.toString(),
      item.submittedAt || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  } else {
    // Detailed report
    const headers = ['Employee', 'Period', 'Status', 'Date', 'Type', 'Start', 'End', 'Note'];
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

