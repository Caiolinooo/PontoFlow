/**
 * OMEGA Invoice Generator - Aligned with OMEGA-mapping-v1.md
 * 
 * Generates invoices compatible with OMEGA Maximus Project format
 */

import {
  OmegaInvoiceDTO,
  OmegaInvoiceGenerationRequest,
  OmegaInvoiceValidationResult,
  OmegaCSVRow,
  OmegaExportOptions,
} from './omega-types';

/**
 * Generate OMEGA invoice from timesheet data
 * 
 * @param request - Invoice generation request with timesheet data
 * @param timesheetData - Raw timesheet data from database
 * @returns OMEGA-compliant invoice DTO
 */
export async function generateOmegaInvoice(
  request: OmegaInvoiceGenerationRequest,
  timesheetData: Record<string, unknown>
): Promise<OmegaInvoiceDTO> {
  // Extract employee info
  const employeeData = timesheetData.employee as Record<string, unknown> | undefined;
  const employee = {
    name: (employeeData?.full_name as string) || (timesheetData.employee_name as string) || 'Unknown',
    id: request.employee_id,
    position: (employeeData?.position as string) || (timesheetData.position as string) || 'N/A',
  };

  // Extract vessel info
  const vesselData = timesheetData.vessel as Record<string, unknown> | undefined;
  const vessel = {
    name: (vesselData?.name as string) || (timesheetData.vessel_name as string) || 'N/A',
  };

  // Calculate work days and hours
  const entries = (timesheetData.entries as Array<Record<string, unknown>>) || [];
  const work = calculateWorkMetrics(entries);

  // Determine rate (from request or default)
  const rate = {
    type: (request.rate_type || 'daily') as 'daily' | 'hourly',
    value: request.rate_value || 0,
    currency: (request.currency || 'GBP') as 'USD' | 'BRL' | 'GBP',
  };

  // Calculate total amount
  const total_amount = rate.type === 'daily' 
    ? work.day_count * rate.value
    : work.hours_regular * rate.value;

  // Build OMEGA invoice
  const invoice: OmegaInvoiceDTO = {
    tenant_id: request.tenant_id,
    environment_slug: request.environment_slug,

    employee,
    vessel,
    cost_center: request.cost_center || (timesheetData.cost_center as string | undefined),
    call_off: request.call_off || (timesheetData.call_off as string | undefined),
    
    period: {
      start: request.period_start,
      end: request.period_end,
    },
    
    work,
    rate,

    total_amount,

    notes: request.notes || (timesheetData.notes as string | undefined),

    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return invoice;
}

/**
 * Calculate work metrics from timesheet entries
 */
function calculateWorkMetrics(entries: Array<Record<string, unknown>>): {
  day_count: number;
  hours_regular: number;
  hours_overtime: number;
} {
  let day_count = 0;
  let hours_regular = 0;
  let hours_overtime = 0;

  for (const entry of entries) {
    // Count unique days
    if (entry.entry_date) {
      day_count++;
    }

    // Sum hours
    if (entry.hours_regular) {
      hours_regular += parseFloat(String(entry.hours_regular)) || 0;
    }
    if (entry.hours_overtime) {
      hours_overtime += parseFloat(String(entry.hours_overtime)) || 0;
    }
  }

  return {
    day_count,
    hours_regular,
    hours_overtime,
  };
}

/**
 * Validate OMEGA invoice
 */
export function validateOmegaInvoice(invoice: OmegaInvoiceDTO): OmegaInvoiceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!invoice.tenant_id) errors.push('tenant_id is required');
  if (!invoice.environment_slug) errors.push('environment_slug is required');
  if (!invoice.employee.name) errors.push('employee.name is required');
  if (!invoice.employee.position) errors.push('employee.position is required');
  if (!invoice.vessel.name) errors.push('vessel.name is required');
  if (!invoice.period.start) errors.push('period.start is required');
  if (!invoice.period.end) errors.push('period.end is required');

  // Validate period
  const startDate = new Date(invoice.period.start);
  const endDate = new Date(invoice.period.end);
  if (endDate < startDate) {
    errors.push('period.end must be after period.start');
  }

  // Validate work metrics
  if (invoice.work.day_count < 0) errors.push('work.day_count cannot be negative');
  if (invoice.work.hours_regular < 0) errors.push('work.hours_regular cannot be negative');
  if (invoice.work.hours_overtime && invoice.work.hours_overtime < 0) {
    errors.push('work.hours_overtime cannot be negative');
  }

  // Validate rate
  if (!['daily', 'hourly'].includes(invoice.rate.type)) {
    errors.push('rate.type must be "daily" or "hourly"');
  }
  if (invoice.rate.value < 0) errors.push('rate.value cannot be negative');
  if (!['USD', 'BRL', 'GBP'].includes(invoice.rate.currency)) {
    errors.push('rate.currency must be USD, BRL, or GBP');
  }

  // Validate total
  if (invoice.total_amount < 0) errors.push('total_amount cannot be negative');

  // Warnings
  if (invoice.work.day_count === 0 && invoice.work.hours_regular === 0) {
    warnings.push('No work days or hours recorded');
  }
  if (invoice.rate.value === 0) {
    warnings.push('Rate value is zero');
  }
  if (invoice.total_amount === 0) {
    warnings.push('Total amount is zero');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Convert OMEGA invoice to CSV row
 */
export function omegaInvoiceToCSVRow(invoice: OmegaInvoiceDTO): OmegaCSVRow {
  return {
    tenant_id: invoice.tenant_id,
    environment_slug: invoice.environment_slug,
    employee_name: invoice.employee.name,
    employee_position: invoice.employee.position,
    vessel_name: invoice.vessel.name,
    cost_center: invoice.cost_center || '',
    call_off: invoice.call_off || '',
    period_start: invoice.period.start,
    period_end: invoice.period.end,
    day_count: invoice.work.day_count,
    hours_regular: invoice.work.hours_regular,
    hours_overtime: invoice.work.hours_overtime || 0,
    rate_type: invoice.rate.type,
    rate_value: invoice.rate.value,
    currency: invoice.rate.currency,
    total_amount: invoice.total_amount,
    notes: invoice.notes || '',
  };
}

/**
 * Convert OMEGA invoice to CSV string
 */
export function omegaInvoiceToCSV(invoices: OmegaInvoiceDTO[]): string {
  const headers = [
    'tenant_id',
    'environment_slug',
    'employee_name',
    'employee_position',
    'vessel_name',
    'cost_center',
    'call_off',
    'period_start',
    'period_end',
    'day_count',
    'hours_regular',
    'hours_overtime',
    'rate_type',
    'rate_value',
    'currency',
    'total_amount',
    'notes',
  ];

  const rows = invoices.map(omegaInvoiceToCSVRow);
  
  const csvLines = [
    headers.join(','),
    ...rows.map(row => 
      headers.map(h => {
        const value = row[h as keyof OmegaCSVRow];
        // Escape commas and quotes in string values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    ),
  ];

  return csvLines.join('\n');
}

/**
 * Convert OMEGA invoice to JSON string
 */
export function omegaInvoiceToJSON(invoice: OmegaInvoiceDTO): string {
  return JSON.stringify(invoice, null, 2);
}

/**
 * Export OMEGA invoice in specified format
 */
export function exportOmegaInvoice(
  invoice: OmegaInvoiceDTO,
  options: OmegaExportOptions
): string | Buffer {
  switch (options.format) {
    case 'json':
      return omegaInvoiceToJSON(invoice);
    
    case 'csv':
      return omegaInvoiceToCSV([invoice]);
    
    case 'pdf':
      // TODO: Implement PDF generation with proper library (pdfkit, puppeteer)
      // For now, return JSON as placeholder
      return Buffer.from(omegaInvoiceToJSON(invoice));
    
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

/**
 * Batch export multiple OMEGA invoices
 */
export function exportOmegaInvoices(
  invoices: OmegaInvoiceDTO[],
  options: OmegaExportOptions
): string | Buffer {
  switch (options.format) {
    case 'json':
      return JSON.stringify(invoices, null, 2);
    
    case 'csv':
      return omegaInvoiceToCSV(invoices);
    
    case 'pdf':
      // TODO: Implement batch PDF generation
      return Buffer.from(JSON.stringify(invoices, null, 2));
    
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

