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
  vesselId?: string;
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
  breakDeducted?: number;
  normalHours?: number;
  extraHours?: number;
  holidayHours?: number;
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

export interface WorkModeConfig {
  mode: 'standard' | 'offshore';
  breakRules?: {
    minHoursForBreak: number;  // Ex: 6 (> 6h requires break)
    breakDuration: number;      // Ex: 60 (1 hour in minutes)
  };
}

/**
 * Calculate worked hours with proper break deduction
 * Supports offshore (no break) vs onshore (CLT rules) modes
 *
 * @param entries - Array of time entries
 * @param workModeConfig - Configuration for work mode (standard/offshore)
 * @returns Detailed hours calculation with breakdown
 */
export function calculateWorkedHours(
  entries: Array<{
    data?: string;
    hora_ini?: string;
    hora_fim?: string;
    tipo?: 'normal' | 'extra' | 'feriado' | 'folga' | string;
  }>,
  workModeConfig: WorkModeConfig = {
    mode: 'standard',
    breakRules: {
      minHoursForBreak: 6,
      breakDuration: 60 // 1 hour in minutes
    }
  }
): {
  totalHours: number;
  totalMinutes: number;
  breakMinutesDeducted: number;
  entriesProcessed: number;
  breakdown: {
    normalHours: number;
    extraHours: number;
    holidayHours: number;
  };
} {
  if (!entries || entries.length === 0) {
    return {
      totalHours: 0,
      totalMinutes: 0,
      breakMinutesDeducted: 0,
      entriesProcessed: 0,
      breakdown: { normalHours: 0, extraHours: 0, holidayHours: 0 }
    };
  }

  let totalMinutes = 0;
  let breakMinutesDeducted = 0;
  let normalMinutes = 0;
  let extraMinutes = 0;
  let holidayMinutes = 0;
  let entriesProcessed = 0;

  // Group entries by date for proper break calculation
  const entriesByDate = new Map<string, typeof entries>();

  for (const entry of entries) {
    if (!entry.hora_ini && !entry.hora_fim) continue;

    const date = entry.data || 'unknown';
    if (!entriesByDate.has(date)) {
      entriesByDate.set(date, []);
    }
    entriesByDate.get(date)!.push(entry);
  }

  // Process each day
  for (const [date, dayEntries] of entriesByDate) {
    let dayTotalMinutes = 0;

    // SMART LOGIC: Process entries for the entire day
    try {
      const tipo = dayEntries[0]?.tipo?.toLowerCase();

      // Check if we have complete entries (with both start and end times)
      const completeEntries = dayEntries.filter(e => e.hora_ini && e.hora_fim);

      if (completeEntries.length > 0) {
        // We have complete entries - use actual time calculation
        for (const entry of completeEntries) {
          const [startHour, startMin] = entry.hora_ini!.split(':').map(Number);
          const [endHour, endMin] = entry.hora_fim!.split(':').map(Number);

          let startTotalMinutes = startHour * 60 + startMin;
          let endTotalMinutes = endHour * 60 + endMin;

          // Handle overnight shifts
          if (endTotalMinutes <= startTotalMinutes) {
            endTotalMinutes += 24 * 60;
          }

          const durationMinutes = endTotalMinutes - startTotalMinutes;
          if (durationMinutes > 0) {
            dayTotalMinutes += durationMinutes;
            entriesProcessed++;
          }
        }
      } else {
        // No complete entries - use smart single time calculation
        const singleTimeEntries = dayEntries.filter(e => e.hora_ini && !e.hora_fim);

        if (singleTimeEntries.length > 0) {
          // Find earliest and latest times for the day
          const times = singleTimeEntries.map(e => {
            const [hour, min] = e.hora_ini!.split(':').map(Number);
            return hour * 60 + min;
          }).sort((a, b) => a - b);

          const earliestTime = times[0];
          const latestTime = times[times.length - 1];

          let durationMinutes = 0;
          const entryTipo = singleTimeEntries[0]?.tipo?.toLowerCase();

          if (entryTipo === 'inicio') {
            // If only 'inicio' entries, assume standard shift (8 hours)
            durationMinutes = 8 * 60;
          } else if (entryTipo === 'folga' || entryTipo === 'feriado') {
            // Single folga/feriado day - count as full day
            durationMinutes = 8 * 60;
          } else if (entryTipo === 'trabalho' || entryTipo === 'normal' || entryTipo === 'extra') {
            // For work entries, calculate based on time spread or standard shift
            if (latestTime - earliestTime > 0) {
              // Calculate actual time spread
              durationMinutes = latestTime - earliestTime;
              // Minimum 4 hours, maximum 12 hours for single entries
              durationMinutes = Math.max(4 * 60, Math.min(12 * 60, durationMinutes));
            } else {
              // Default to 8 hours for single work entry
              durationMinutes = 8 * 60;
            }
          } else {
            // Default for unknown types
            durationMinutes = 4 * 60;
          }

          dayTotalMinutes += durationMinutes;
          entriesProcessed++;
        }
      }

      // Categorize the day's hours by type
      const mainTipo = dayEntries[0]?.tipo?.toLowerCase();
      switch (mainTipo) {
        case 'normal':
        case 'trabalho':
          normalMinutes += dayTotalMinutes;
          break;
        case 'extra':
          extraMinutes += dayTotalMinutes;
          break;
        case 'feriado':
          holidayMinutes += dayTotalMinutes;
          break;
        case 'folga':
          // Folga hours don't count in worked hours totals
          dayTotalMinutes = 0; // Reset so folga doesn't affect total worked hours
          break;
        case 'inicio':
          // 'inicio' alone doesn't count unless mixed with other types
          if (dayEntries.length > 1) {
            normalMinutes += dayTotalMinutes;
          } else {
            dayTotalMinutes = 0;
          }
          break;
        default:
          // Default to normal hours for unknown types
          normalMinutes += dayTotalMinutes;
      }

    } catch (error) {
      console.warn('Error processing day entries:', error, dayEntries);
    }

    // Apply break deduction for this day (ONLY for standard mode)
    if (workModeConfig.mode === 'standard' && workModeConfig.breakRules) {
      const dayHours = dayTotalMinutes / 60;

      if (dayHours > workModeConfig.breakRules.minHoursForBreak) {
        // Deduct break time
        const breakToDeduct = workModeConfig.breakRules.breakDuration;
        dayTotalMinutes -= breakToDeduct;
        breakMinutesDeducted += breakToDeduct;
      }
    }

    totalMinutes += Math.max(0, dayTotalMinutes); // Never negative
  }

  // Adjust categorized minutes for break deduction (proportional)
  if (breakMinutesDeducted > 0 && totalMinutes > 0) {
    const ratio = (totalMinutes - breakMinutesDeducted) / totalMinutes;
    normalMinutes = Math.round(normalMinutes * ratio);
    extraMinutes = Math.round(extraMinutes * ratio);
    holidayMinutes = Math.round(holidayMinutes * ratio);
  }

  return {
    totalHours: Math.round((totalMinutes / 60) * 100) / 100,
    totalMinutes: Math.round(totalMinutes),
    breakMinutesDeducted,
    entriesProcessed,
    breakdown: {
      normalHours: Math.round((normalMinutes / 60) * 100) / 100,
      extraHours: Math.round((extraMinutes / 60) * 100) / 100,
      holidayHours: Math.round((holidayMinutes / 60) * 100) / 100,
    }
  };
}

/**
 * Calculate total hours from timesheet entries (Legacy - kept for backward compatibility)
 * @deprecated Use calculateWorkedHours instead for proper break deduction
 */
export function calculateTotalHours(entries: Array<{ hora_ini?: string; hora_fim?: string }>): number {
  const result = calculateWorkedHours(entries, { mode: 'offshore' }); // No break deduction for legacy
  return result.totalHours;
}

/**
 * Calculate duration for a single entry in hours
 */
function calculateEntryDuration(entry: { hora_ini?: string; hora_fim?: string; tipo?: string }): number {
  // For detailed reports, show individual entry duration
  if (entry.hora_ini && entry.hora_fim) {
    // Complete entry with both times - calculate actual duration
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
  } else if (entry.hora_ini && !entry.hora_fim) {
    // Single time entry - this will be processed as part of daily calculation
    // In detailed view, we show what's recorded or a reasonable estimate
    const tipo = entry.tipo?.toLowerCase();
    if (tipo === 'inicio') {
      return 0; // 'inicio' is just a marker
    } else if (tipo === 'folga' || tipo === 'feriado') {
      return 0; // Will be calculated at daily level
    } else if (tipo === 'trabalho' || tipo === 'normal') {
      return 0; // Will be calculated at daily level
    } else if (tipo === 'extra') {
      return 0; // Will be calculated at daily level
    } else {
      return 0; // Will be calculated at daily level
    }
  }

  return 0;
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
 * Generate summary report with hour calculations and work mode support
 */
export function generateSummaryReport(
  timesheets: TimesheetBasic[],
  filters: ReportFilters,
  workModeConfig?: WorkModeConfig
): SummaryReport {
  // Use default standard mode if not provided (backward compatibility)
  const config: WorkModeConfig = workModeConfig || {
    mode: 'standard',
    breakRules: {
      minHoursForBreak: 6,
      breakDuration: 60
    }
  };

  const allItems: ReportEntry[] = timesheets.map(t => {
    const entries = t.entries || [];
    const hoursCalc = calculateWorkedHours(entries, config);

    return {
      id: t.id,
      employeeName: t.employee?.display_name || 'Unknown',
      employeeId: t.employee_id,
      vesselName: t.employee?.vessel?.name,
      vesselCode: t.employee?.vessel?.code,
      vesselId: t.employee?.vessel_id,
      period: `${t.periodo_ini} - ${t.periodo_fim}`,
      status: t.status,
      entryCount: entries.length, // Show total entries count, not just processed
      submittedAt: t.created_at,
      approvedAt: t.updated_at,
      totalHours: hoursCalc.totalHours,
      totalMinutes: hoursCalc.totalMinutes,
      breakDeducted: hoursCalc.breakMinutesDeducted,
      normalHours: hoursCalc.breakdown.normalHours,
      extraHours: hoursCalc.breakdown.extraHours,
      holidayHours: hoursCalc.breakdown.holidayHours
    };
  });

  // Include all timesheets, even those with no valid hours
  // This ensures total hours are calculated correctly
  const items = allItems;

  const totalHours = items.reduce((sum, item) => sum + (item.totalHours || 0), 0);
  const averageHours = items.length > 0 ? Math.round((totalHours / items.length) * 100) / 100 : 0;

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
 * Generate detailed report with hour calculations and work mode support
 */
export function generateDetailedReport(
  timesheets: TimesheetBasic[],
  filters: ReportFilters,
  workModeConfig?: WorkModeConfig
): DetailedReport {
  // Use default standard mode if not provided (backward compatibility)
  const config: WorkModeConfig = workModeConfig || {
    mode: 'standard',
    breakRules: {
      minHoursForBreak: 6,
      breakDuration: 60
    }
  };

  const allItems = timesheets.map(t => {
    const entries = t.entries || [];
    const hoursCalc = calculateWorkedHours(entries, config);

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
        entryCount: entries.length, // Show total entries count, not just processed
        submittedAt: t.created_at,
        totalHours: hoursCalc.totalHours,
        totalMinutes: hoursCalc.totalMinutes,
        breakDeducted: hoursCalc.breakMinutesDeducted,
        normalHours: hoursCalc.breakdown.normalHours,
        extraHours: hoursCalc.breakdown.extraHours,
        holidayHours: hoursCalc.breakdown.holidayHours
      },
      entries: entries.map(entry => ({
        ...entry,
        duration: calculateEntryDuration(entry)
      })),
      annotations: t.annotations || [],
      approvals: t.approvals || [],
    };
  });

  // Include all timesheets, even those with no valid hours
  // This ensures consistency with summary report
  const items = allItems;

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
  userRole: string,
  workModeConfig?: WorkModeConfig
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
    summary: generateSummaryReport(filteredTimesheets, filters, workModeConfig),
    detailed: generateDetailedReport(filteredTimesheets, filters, workModeConfig)
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
  filters: ReportFilters,
  workModeConfig?: WorkModeConfig
): SummaryReport {
  const report = generateSummaryReport(timesheets, filters, workModeConfig);

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
    const normalHours = items.reduce((sum, item) => sum + (item.normalHours || 0), 0);
    const extraHours = items.reduce((sum, item) => sum + (item.extraHours || 0), 0);
    const holidayHours = items.reduce((sum, item) => sum + (item.holidayHours || 0), 0);

    groupedItems.push({
      id: `employee-${employeeId}`,
      employeeName: items[0].employeeName,
      employeeId,
      period: `${items.length} timesheet(s)`,
      status: 'grouped',
      entryCount: items.reduce((sum, item) => sum + item.entryCount, 0),
      totalHours,
      totalMinutes,
      normalHours,
      extraHours,
      holidayHours
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
  filters: ReportFilters,
  workModeConfig?: WorkModeConfig
): SummaryReport {
  const report = generateSummaryReport(timesheets, filters, workModeConfig);

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
    const normalHours = items.reduce((sum, item) => sum + (item.normalHours || 0), 0);
    const extraHours = items.reduce((sum, item) => sum + (item.extraHours || 0), 0);
    const holidayHours = items.reduce((sum, item) => sum + (item.holidayHours || 0), 0);
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
      totalMinutes,
      normalHours,
      extraHours,
      holidayHours
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