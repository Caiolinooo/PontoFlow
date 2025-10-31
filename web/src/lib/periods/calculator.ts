/**
 * Advanced period calculation system for custom tenant deadlines
 * Supports custom deadline days (e.g., ABZ tenant with deadline on day 16)
 */

import { addMonths, subMonths, startOfMonth, endOfMonth, differenceInDays, isAfter, isBefore, parseISO } from 'date-fns';
import { TimezoneType, getCurrentTimeInTenantTimezone } from '@/lib/timezone/utils';

/**
 * Calculate current timesheet period for tenant based on deadline configuration
 * For deadline day 16: periods go from day 16 to day 15 of next month
 */
export function calculateCurrentTimesheetPeriod(
  tenantTimezone: TimezoneType,
  deadlineDay: number = 5 // Default: 5th of next month
): {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  periodKey: string; // YYYY-MM format for display
  isTransitionPeriod: boolean; // True if we're in the transition between periods
} {
  const now = getCurrentTimeInTenantTimezone(tenantTimezone);
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let periodStart: Date;
  let periodEnd: Date;

  // For standard deadline (day 1-28), use regular month periods
  if (deadlineDay >= 1 && deadlineDay <= 28) {
    if (currentDay >= deadlineDay) {
      // We're after deadline, current period started this month
      periodStart = new Date(currentYear, currentMonth, deadlineDay);
      periodEnd = addMonths(periodStart, 1);
      periodEnd.setDate(deadlineDay - 1);
    } else {
      // We're before deadline, current period started last month
      periodStart = subMonths(new Date(currentYear, currentMonth, deadlineDay), 1);
      periodEnd = new Date(currentYear, currentMonth, deadlineDay);
      periodEnd.setDate(deadlineDay - 1);
    }
  } else if (deadlineDay === 0) {
    // Last day of month (standard calendar month)
    periodStart = startOfMonth(now);
    periodEnd = endOfMonth(now);
  } else {
    // Fallback to standard month
    periodStart = startOfMonth(now);
    periodEnd = endOfMonth(now);
  }

  // Convert to strings
  const startDateStr = periodStart.toISOString().split('T')[0];
  const endDateStr = periodEnd.toISOString().split('T')[0];
  const periodKey = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;

  // Check if we're in transition period (last few days before deadline)
  const daysUntilDeadline = differenceInDays(periodEnd, now);
  const isTransitionPeriod = daysUntilDeadline <= 3 && daysUntilDeadline >= 0;

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    periodKey,
    isTransitionPeriod
  };
}

/**
 * Calculate all timesheet periods for a given range
 */
export function calculateTimesheetPeriods(
  tenantTimezone: TimezoneType,
  deadlineDay: number = 5,
  startDate?: string,
  endDate?: string
): Array<{
  startDate: string;
  endDate: string;
  periodKey: string;
  label?: string;
  isTransitionPeriod: boolean;
}> {
  const periods = [];
  const now = getCurrentTimeInTenantTimezone(tenantTimezone);
  
  // Determine range to generate periods for
  const rangeStart = startDate ? parseISO(startDate) : subMonths(now, 3);
  const rangeEnd = endDate ? parseISO(endDate) : addMonths(now, 1);

  let currentPeriod = calculateCurrentTimesheetPeriod(tenantTimezone, deadlineDay);
  let periodStart = parseISO(currentPeriod.startDate);

  // Generate periods going backwards and forwards
  while (isAfter(periodStart, rangeStart) || periodStart >= rangeStart) {
    const period = calculateTimesheetPeriodForDate(periodStart, tenantTimezone, deadlineDay);
    periods.unshift(period); // Add to beginning to maintain chronological order
    
    // Move to previous period
    periodStart = subMonths(periodStart, 1);
    currentPeriod = calculateTimesheetPeriodForDate(periodStart, tenantTimezone, deadlineDay);
    periodStart = parseISO(currentPeriod.startDate);
  }

  // Generate forward periods
  periodStart = addMonths(parseISO(currentPeriod.startDate), 1);
  while (isBefore(periodStart, rangeEnd)) {
    const period = calculateTimesheetPeriodForDate(periodStart, tenantTimezone, deadlineDay);
    periods.push(period);
    periodStart = addMonths(periodStart, 1);
  }

  return periods;
}

/**
 * Calculate timesheet period for a specific date
 */
export function calculateTimesheetPeriodForDate(
  date: Date,
  tenantTimezone: TimezoneType,
  deadlineDay: number = 5
): {
  startDate: string;
  endDate: string;
  periodKey: string;
  label?: string;
  isTransitionPeriod: boolean;
} {
  let periodStart: Date;
  let periodEnd: Date;

  // Calculate based on deadline configuration
  if (deadlineDay >= 1 && deadlineDay <= 28) {
    const dateDay = date.getDate();
    const dateMonth = date.getMonth();
    const dateYear = date.getFullYear();

    if (dateDay >= deadlineDay) {
      // Date is after deadline, period started this month
      periodStart = new Date(dateYear, dateMonth, deadlineDay);
      periodEnd = new Date(dateYear, dateMonth + 1, deadlineDay);
      periodEnd.setDate(deadlineDay - 1);
    } else {
      // Date is before deadline, period started last month
      periodStart = new Date(dateYear, dateMonth - 1, deadlineDay);
      periodEnd = new Date(dateYear, dateMonth, deadlineDay);
      periodEnd.setDate(deadlineDay - 1);
    }
  } else if (deadlineDay === 0) {
    // Last day of month
    periodStart = startOfMonth(date);
    periodEnd = endOfMonth(date);
  } else {
    // Fallback to standard month
    periodStart = startOfMonth(date);
    periodEnd = endOfMonth(date);
  }

  // Create label in format "16/10/2025 - 15/11/2025"
  const startLabel = periodStart.toLocaleDateString('pt-BR');
  const endLabel = periodEnd.toLocaleDateString('pt-BR');
  const label = `${startLabel} - ${endLabel}`;

  // Period key for grouping (YYYY-MM based on start month)
  const periodKey = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;

  return {
    startDate: periodStart.toISOString().split('T')[0],
    endDate: periodEnd.toISOString().split('T')[0],
    periodKey,
    label,
    isTransitionPeriod: false
  };
}

/**
 * Get the active timesheet period for today
 */
export function getActiveTimesheetPeriod(
  tenantTimezone: TimezoneType,
  deadlineDay: number = 5
): {
  startDate: string;
  endDate: string;
  periodKey: string;
  label?: string;
  isTransitionPeriod: boolean;
  daysUntilDeadline: number;
  isOverdue: boolean;
} {
  const now = getCurrentTimeInTenantTimezone(tenantTimezone);
  const period = calculateCurrentTimesheetPeriod(tenantTimezone, deadlineDay);
  const periodDetails = calculateTimesheetPeriodForDate(now, tenantTimezone, deadlineDay);

  const periodEnd = parseISO(period.endDate);
  const daysUntilDeadline = differenceInDays(periodEnd, now);
  const isOverdue = daysUntilDeadline < 0;

  return {
    ...periodDetails,
    daysUntilDeadline,
    isOverdue
  };
}

/**
 * Check if a timesheet belongs to the current active period
 */
export function isTimesheetInCurrentPeriod(
  timesheetPeriodStart: string,
  timesheetPeriodEnd: string,
  tenantTimezone: TimezoneType,
  deadlineDay: number = 5
): boolean {
  const activePeriod = calculateCurrentTimesheetPeriod(tenantTimezone, deadlineDay);
  
  const tsStart = parseISO(timesheetPeriodStart);
  const tsEnd = parseISO(timesheetPeriodEnd);
  const activeStart = parseISO(activePeriod.startDate);
  const activeEnd = parseISO(activePeriod.endDate);

  return tsStart.getTime() === activeStart.getTime() && tsEnd.getTime() === activeEnd.getTime();
}

/**
 * Get period status based on deadline and current time
 */
export function getPeriodStatus(
  periodStart: string,
  periodEnd: string,
  tenantTimezone: TimezoneType,
  deadlineDay: number = 5
): {
  status: 'active' | 'closing_soon' | 'overdue' | 'closed';
  daysUntilDeadline: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
} {
  const now = getCurrentTimeInTenantTimezone(tenantTimezone);
  const endDate = parseISO(periodEnd);
  const daysUntilDeadline = differenceInDays(endDate, now);
  
  let status: 'active' | 'closing_soon' | 'overdue' | 'closed';
  let urgencyLevel: 'low' | 'medium' | 'high' | 'critical';

  if (daysUntilDeadline < 0) {
    status = 'overdue';
    urgencyLevel = 'critical';
  } else if (daysUntilDeadline <= 1) {
    status = 'closing_soon';
    urgencyLevel = 'critical';
  } else if (daysUntilDeadline <= 3) {
    status = 'closing_soon';
    urgencyLevel = 'high';
  } else if (daysUntilDeadline <= 7) {
    status = 'active';
    urgencyLevel = 'medium';
  } else {
    status = 'active';
    urgencyLevel = 'low';
  }

  return {
    status,
    daysUntilDeadline,
    urgencyLevel
  };
}