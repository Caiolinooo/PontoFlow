import React from 'react';

/**
 * Time Display Utilities
 * Handles proper formatting and display of time values, including negative values
 */

export interface TimeDisplayOptions {
  showSign?: boolean; // Show + or - for positive/negative values
  decimals?: number; // Number of decimal places (default: 2)
  suffix?: string; // Optional suffix like "hrs", "h"
  prefix?: string; // Optional prefix like "Total: "
}

/**
 * Format time value for display, handling positive and negative values properly
 */
export function formatTimeDisplay(
  value: number, 
  options: TimeDisplayOptions = {}
): string {
  const {
    showSign = false,
    decimals = 2,
    suffix = 'h',
    prefix = ''
  } = options;

  // Handle null/undefined/NaN values
  if (value === null || value === undefined || isNaN(value)) {
    return `${prefix}0 ${suffix}`.trim();
  }

  // Format the number to specified decimals
  const formattedValue = Math.abs(value).toFixed(decimals);
  
  // Add sign if requested and value is not zero
  let displayValue = formattedValue;
  if (showSign && value !== 0) {
    displayValue = value > 0 ? `+${formattedValue}` : `-${formattedValue}`;
  }

  return `${prefix}${displayValue} ${suffix}`.trim();
}

/**
 * Format time with color coding based on positive/negative values
 */
export function formatTimeWithContext(
  value: number,
  context: 'overtime' | 'undertime' | 'total' = 'total'
): {
  formatted: string;
  colorClass: string;
  icon?: string;
} {
  const colorClass = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600';
  
  let icon = '';
  if (context === 'overtime' && value > 0) icon = '⏰';
  if (context === 'undertime' && value < 0) icon = '⚠️';
  if (context === 'total' && value < 0) icon = '📉';
  if (context === 'total' && value > 0) icon = '📈';

  return {
    formatted: formatTimeDisplay(value, { showSign: true, suffix: 'h' }),
    colorClass,
    icon
  };
}

/**
 * Calculate overtime/undertime from total hours worked
 */
export function calculateOvertimeMetrics(totalHours: number) {
  const regularHours = Math.min(totalHours, 160);
  const overtime50 = Math.max(0, totalHours - 160);
  const overtime100 = Math.max(0, totalHours - 200);
  const undertime = totalHours < 0 ? totalHours : 0; // Only negative total becomes undertime

  return {
    regular: regularHours,
    overtime50,
    overtime100,
    undertime,
    total: totalHours
  };
}

/**
 * Format time for different contexts with appropriate suffixes and styling
 */
export const TimeFormatters = {
  dashboard: (value: number) => formatTimeDisplay(value, { showSign: true, suffix: 'h' }),
  
  report: (value: number) => formatTimeDisplay(value, { decimals: 2, suffix: ' hrs' }),
  
  overtime: (value: number) => {
    const { formatted, colorClass, icon } = formatTimeWithContext(value, 'overtime');
    return { display: formatted, colorClass, icon };
  },
  
  undertime: (value: number) => {
    const { formatted, colorClass, icon } = formatTimeWithContext(value, 'undertime');
    return { display: formatted, colorClass, icon };
  },
  
  total: (value: number) => {
    const { formatted, colorClass, icon } = formatTimeWithContext(value, 'total');
    return { display: formatted, colorClass, icon };
  }
};

/**
 * Display time with context-aware formatting for React components
 */
export function TimeDisplay({ 
  value, 
  context = 'total',
  className = '',
  showIcon = true 
}: {
  value: number;
  context?: 'overtime' | 'undertime' | 'total';
  className?: string;
  showIcon?: boolean;
}) {
  const formatter = TimeFormatters[context](value);
  const icon = showIcon ? formatter.icon : '';
  
  return (
    <span className={`${formatter.colorClass} ${className}`}>
      {icon && <span className="mr-1">{icon}</span>}
      {formatter.display}
    </span>
  );
}

/**
 * Utility to ensure time values are properly formatted before display
 */
export function normalizeTimeValue(value: any): number {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return 0;
  }
  return Number(value);
}