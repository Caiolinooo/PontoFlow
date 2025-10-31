/**
 * Timezone utilities for multi-tenant timesheet system
 * Provides timezone-aware date calculations and conversions
 */

import { format, parseISO, addDays, differenceInDays, isAfter, isBefore } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

export type TimezoneType = 'UTC' | 'America/Sao_Paulo' | 'America/New_York' | 'Europe/London' | 'Asia/Tokyo' | string;

/**
 * Available timezone options for tenant configuration
 */
export const TIMEZONE_OPTIONS: Array<{ value: TimezoneType; label: string; group: string }> = [
  // Americas
  { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)', group: 'Americas' },
  { value: 'America/New_York', label: 'New York (UTC-5)', group: 'Americas' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)', group: 'Americas' },
  { value: 'America/Chicago', label: 'Chicago (UTC-6)', group: 'Americas' },
  { value: 'America/Mexico_City', label: 'Mexico City (UTC-6)', group: 'Americas' },
  { value: 'America/Bogota', label: 'Bogotá (UTC-5)', group: 'Americas' },
  { value: 'America/Lima', label: 'Lima (UTC-5)', group: 'Americas' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (UTC-3)', group: 'Americas' },
  { value: 'America/Santiago', label: 'Santiago (UTC-4)', group: 'Americas' },
  
  // Europe
  { value: 'Europe/London', label: 'London (UTC+0)', group: 'Europe' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1)', group: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+1)', group: 'Europe' },
  { value: 'Europe/Madrid', label: 'Madrid (UTC+1)', group: 'Europe' },
  { value: 'Europe/Rome', label: 'Rome (UTC+1)', group: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (UTC+1)', group: 'Europe' },
  { value: 'Europe/Lisbon', label: 'Lisbon (UTC+0)', group: 'Europe' },
  { value: 'Europe/Moscow', label: 'Moscow (UTC+3)', group: 'Europe' },
  
  // Asia
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)', group: 'Asia' },
  { value: 'Asia/Shanghai', label: 'Shanghai (UTC+8)', group: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (UTC+8)', group: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+8)', group: 'Asia' },
  { value: 'Asia/Seoul', label: 'Seoul (UTC+9)', group: 'Asia' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (UTC+8)', group: 'Asia' },
  { value: 'Asia/Bangkok', label: 'Bangkok (UTC+7)', group: 'Asia' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+4)', group: 'Asia' },
  
  // Africa
  { value: 'Africa/Cairo', label: 'Cairo (UTC+2)', group: 'Africa' },
  { value: 'Africa/Lagos', label: 'Lagos (UTC+1)', group: 'Africa' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (UTC+2)', group: 'Africa' },
  
  // Oceania
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10)', group: 'Oceania' },
  { value: 'Australia/Melbourne', label: 'Melbourne (UTC+10)', group: 'Oceania' },
  { value: 'Pacific/Auckland', label: 'Auckland (UTC+12)', group: 'Oceania' },
  
  // UTC
  { value: 'UTC', label: 'UTC (UTC+0)', group: 'Other' }
];

/**
 * Get timezone options grouped by continent/region
 */
export function getTimezoneOptionsByGroup(): Record<string, Array<{ value: TimezoneType; label: string }>> {
  return TIMEZONE_OPTIONS.reduce((acc, option) => {
    if (!acc[option.group]) {
      acc[option.group] = [];
    }
    acc[option.group].push({
      value: option.value,
      label: option.label
    });
    return acc;
  }, {} as Record<string, Array<{ value: TimezoneType; label: string }>>);
}

/**
 * Validate if a timezone string is valid
 */
export function isValidTimezone(timezone: string): timezone is TimezoneType {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert UTC timestamp to tenant timezone
 */
export function convertToTenantTimezone(
  utcTimestamp: string | Date,
  tenantTimezone: TimezoneType
): Date {
  const date = typeof utcTimestamp === 'string' ? parseISO(utcTimestamp) : utcTimestamp;
  return toZonedTime(date, tenantTimezone);
}

/**
 * Convert tenant timezone timestamp to UTC
 */
export function convertFromTenantTimezone(
  tenantTimestamp: string | Date,
  tenantTimezone: TimezoneType
): Date {
  const date = typeof tenantTimestamp === 'string' ? parseISO(tenantTimestamp) : tenantTimestamp;
  return fromZonedTime(date, tenantTimezone);
}

/**
 * Get current timestamp in tenant timezone
 */
export function getCurrentTimeInTenantTimezone(tenantTimezone: TimezoneType): Date {
  return toZonedTime(new Date(), tenantTimezone);
}

/**
 * Format date in tenant timezone
 */
export function formatDateInTimezone(
  date: Date | string,
  tenantTimezone: TimezoneType,
  formatString: string = 'yyyy-MM-dd'
): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(parsedDate, tenantTimezone, formatString);
}

/**
 * Get start of day in tenant timezone
 */
export function getStartOfDayInTimezone(
  date: Date | string,
  tenantTimezone: TimezoneType
): Date {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  const zonedDate = toZonedTime(parsedDate, tenantTimezone);
  return new Date(zonedDate.getFullYear(), zonedDate.getMonth(), zonedDate.getDate());
}

/**
 * Get end of day in tenant timezone
 */
export function getEndOfDayInTimezone(
  date: Date | string,
  tenantTimezone: TimezoneType
): Date {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  const zonedDate = toZonedTime(parsedDate, tenantTimezone);
  return new Date(
    zonedDate.getFullYear(),
    zonedDate.getMonth(),
    zonedDate.getDate(),
    23,
    59,
    59,
    999
  );
}

/**
 * Calculate timesheet deadline in tenant timezone
 * Default: 5th of next month
 */
export function calculateTimesheetDeadline(
  periodStart: Date | string,
  tenantTimezone: TimezoneType,
  customDeadlineDay?: number
): Date {
  const parsedDate = typeof periodStart === 'string' ? parseISO(periodStart) : periodStart;
  const zonedDate = toZonedTime(parsedDate, tenantTimezone);
  
  // Get first day of next month in tenant timezone
  const nextMonth = new Date(zonedDate.getFullYear(), zonedDate.getMonth() + 1, 1);
  const deadlineDay = customDeadlineDay || 5;
  
  // Handle case where deadline day is 0 (last day of month)
  if (deadlineDay === 0) {
    const lastDayOfMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 0);
    return fromZonedTime(lastDayOfMonth, tenantTimezone);
  }
  
  // Set deadline day
  const deadline = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), deadlineDay);
  return fromZonedTime(deadline, tenantTimezone);
}

/**
 * Check if timesheet period is past deadline in tenant timezone
 */
export function isPastDeadline(
  periodStart: Date | string,
  tenantTimezone: TimezoneType,
  customDeadlineDay?: number
): boolean {
  const deadline = calculateTimesheetDeadline(periodStart, tenantTimezone, customDeadlineDay);
  const currentTimeInTz = getCurrentTimeInTenantTimezone(tenantTimezone);
  
  // Compare in tenant timezone to ensure correct calculation
  const currentUtc = fromZonedTime(currentTimeInTz, tenantTimezone);
  return currentUtc > deadline;
}

/**
 * Get days remaining until deadline in tenant timezone
 */
export function getDaysUntilDeadline(
  periodStart: Date | string,
  tenantTimezone: TimezoneType,
  customDeadlineDay?: number
): number {
  const deadline = calculateTimesheetDeadline(periodStart, tenantTimezone, customDeadlineDay);
  const currentTimeInTz = getCurrentTimeInTenantTimezone(tenantTimezone);
  const currentUtc = fromZonedTime(currentTimeInTz, tenantTimezone);
  
  return Math.ceil((deadline.getTime() - currentUtc.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get current period for timesheet based on tenant timezone
 */
export function getCurrentTimesheetPeriod(tenantTimezone: TimezoneType): {
  start: string;
  end: string;
  month: string;
  year: string;
} {
  const nowInTz = getCurrentTimeInTenantTimezone(tenantTimezone);
  const year = nowInTz.getFullYear();
  const month = String(nowInTz.getMonth() + 1).padStart(2, '0');
  
  return {
    start: formatInTimeZone(nowInTz, tenantTimezone, 'yyyy-MM-01'),
    end: formatInTimeZone(nowInTz, tenantTimezone, 'yyyy-MM-dd'),
    month,
    year: String(year)
  };
}

/**
 * Get previous period for timesheet based on tenant timezone
 */
export function getPreviousTimesheetPeriod(tenantTimezone: TimezoneType): {
  start: string;
  end: string;
  month: string;
  year: string;
} {
  const nowInTz = getCurrentTimeInTenantTimezone(tenantTimezone);
  const firstDayCurrentMonth = new Date(nowInTz.getFullYear(), nowInTz.getMonth(), 1);
  const previousMonth = new Date(firstDayCurrentMonth.getFullYear(), firstDayCurrentMonth.getMonth() - 1, 1);
  const lastDayPreviousMonth = new Date(firstDayCurrentMonth.getFullYear(), firstDayCurrentMonth.getMonth(), 0);
  
  return {
    start: formatInTimeZone(previousMonth, tenantTimezone, 'yyyy-MM-dd'),
    end: formatInTimeZone(lastDayPreviousMonth, tenantTimezone, 'yyyy-MM-dd'),
    month: String(previousMonth.getMonth() + 1).padStart(2, '0'),
    year: String(previousMonth.getFullYear())
  };
}

/**
 * Format timesheet period display string in tenant timezone
 */
export function formatTimesheetPeriodDisplay(
  startDate: Date | string,
  endDate: Date | string,
  tenantTimezone: TimezoneType,
  locale: string = 'pt-BR'
): string {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  // Use date-fns format with timezone conversion for proper locale support
  const startZoned = toZonedTime(start, tenantTimezone);
  const endZoned = toZonedTime(end, tenantTimezone);
  
  const formatStr = 'dd/MM/yyyy';
  
  try {
    const formattedStart = format(startZoned, formatStr);
    const formattedEnd = format(endZoned, formatStr);
    return `${formattedStart} - ${formattedEnd}`;
  } catch (error) {
    // Fallback formatting without locale
    const fallbackStart = startZoned.toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-GB');
    const fallbackEnd = endZoned.toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-GB');
    return `${fallbackStart} - ${fallbackEnd}`;
  }
}

/**
 * Get timezone abbreviation (e.g., "BRT", "EST", "UTC")
 */
export function getTimezoneAbbreviation(tenantTimezone: TimezoneType): string {
  const tzAbbr: Record<TimezoneType, string> = {
    'America/Sao_Paulo': 'BRT',
    'America/New_York': 'EST',
    'America/Chicago': 'CST',
    'America/Denver': 'MST',
    'America/Los_Angeles': 'PST',
    'Europe/London': 'GMT',
    'Europe/Paris': 'CET',
    'Europe/Berlin': 'CET',
    'Asia/Tokyo': 'JST',
    'Asia/Shanghai': 'CST',
    'Asia/Hong_Kong': 'HKT',
    'UTC': 'UTC'
  };
  
  return tzAbbr[tenantTimezone] || 'UTC';
}

/**
 * Check if tenant timezone observes daylight saving time
 */
export function observesDST(tenantTimezone: TimezoneType): boolean {
  // Timezones that observe DST
  const dstTimezones: TimezoneType[] = [
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin'
  ];
  
  return dstTimezones.includes(tenantTimezone);
}