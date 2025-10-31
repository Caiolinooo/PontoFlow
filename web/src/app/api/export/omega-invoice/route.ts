/**
 * OMEGA Invoice Export API
 * 
 * Generates invoices compatible with OMEGA Maximus Project format
 * Aligned with docs/export/OMEGA-mapping-v1.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateOmegaInvoice,
  validateOmegaInvoice,
  exportOmegaInvoice,
  exportOmegaInvoices,
} from '@/lib/invoice/omega-generator';
import type { OmegaExportFormat } from '@/lib/invoice/omega-types';

/**
 * POST /api/export/omega-invoice
 * 
 * Generate OMEGA-compliant invoice from timesheet
 * 
 * Request body:
 * {
 *   timesheetId: string;
 *   format?: 'json' | 'csv' | 'pdf';
 *   rateType?: 'daily' | 'hourly';
 *   rateValue?: number;
 *   currency?: 'USD' | 'BRL' | 'GBP';
 *   costCenter?: string;
 *   callOff?: string;
 *   notes?: string;
 * }
 */
export async function POST(req: NextRequest) {
  const user = await requireApiAuth();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const body = await req.json();
    const {
      timesheetId,
      format = 'json',
      rateType,
      rateValue,
      currency = 'GBP',
      costCenter,
      callOff,
      notes,
    } = body;

    if (!timesheetId) {
      return NextResponse.json(
        { error: 'timesheetId is required' },
        { status: 400 }
      );
    }

    // Validate format
    const validFormats: OmegaExportFormat[] = ['json', 'csv', 'pdf'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // Get tenant_id from custom auth user
    const tenantId = user.tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID not found for user' },
        { status: 400 }
      );
    }

    // Fetch timesheet with related data
    const { data: timesheet, error: timesheetError } = await supabase
      .from('timesheets')
      .select(
        `
        id,
        employee_id,
        periodo_ini,
        periodo_fim,
        status,
        employee:employees(
          id,
          display_name,
          full_name,
          position,
          hourly_rate,
          daily_rate
        ),
        vessel:vessels(
          id,
          name
        ),
        entries:timesheet_entries(
          id,
          entry_date,
          tipo,
          hours_regular,
          hours_overtime,
          notes
        )
      `
      )
      .eq('id', timesheetId)
      .single();

    if (timesheetError || !timesheet) {
      return NextResponse.json(
        { error: 'Timesheet not found', details: timesheetError?.message },
        { status: 404 }
      );
    }

    // Check tenant isolation
    const { data: employeeTenant } = await supabase
      .from('employees')
      .select('tenant_id')
      .eq('id', timesheet.employee_id)
      .single();

    if (employeeTenant?.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: 'Access denied: tenant mismatch' },
        { status: 403 }
      );
    }

    // Determine rate value
    const employeeRel = (timesheet as { employee?: { daily_rate?: number; hourly_rate?: number } }).employee;
    const defaultRateValue = rateType === 'daily'
      ? (employeeRel?.daily_rate || 0)
      : (employeeRel?.hourly_rate || 0);

    // Build generation request
    const generationRequest = {
      timesheet_id: timesheetId,
      tenant_id: tenantId,
      environment_slug: 'omega', // Default to 'omega', can be parameterized
      employee_id: timesheet.employee_id,
      period_start: timesheet.periodo_ini,
      period_end: timesheet.periodo_fim,
      rate_type: rateType,
      rate_value: rateValue !== undefined ? rateValue : defaultRateValue,
      currency,
      cost_center: costCenter,
      call_off: callOff,
      notes,
    };

    // Generate OMEGA invoice
    const invoice = await generateOmegaInvoice(generationRequest, timesheet);

    // Validate invoice
    const validation = validateOmegaInvoice(invoice);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invoice validation failed',
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    // Export in requested format
    const exported = exportOmegaInvoice(invoice, { format });

    // Set response headers based on format
    const contentType = format === 'json'
      ? 'application/json'
      : format === 'csv'
      ? 'text/csv'
      : 'application/pdf';

    const filename = `omega-invoice-${timesheet.employee_id}-${timesheet.periodo_ini}.${format}`;

    // Convert to string if needed
    const responseBody = typeof exported === 'string' ? exported : JSON.stringify(exported);

    return new NextResponse(responseBody, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('OMEGA invoice export error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate OMEGA invoice', details: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/export/omega-invoice?timesheetIds=id1,id2&format=csv
 * 
 * Batch export multiple timesheets as OMEGA invoices
 */
export async function GET(req: NextRequest) {
  const user = await requireApiAuth();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { searchParams } = new URL(req.url);
    const timesheetIdsParam = searchParams.get('timesheetIds');
    const format = (searchParams.get('format') || 'json') as OmegaExportFormat;

    if (!timesheetIdsParam) {
      return NextResponse.json(
        { error: 'timesheetIds parameter is required' },
        { status: 400 }
      );
    }

    const timesheetIds = timesheetIdsParam.split(',').map(id => id.trim());

    if (timesheetIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one timesheetId is required' },
        { status: 400 }
      );
    }

    const tenantId = user.tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID not found for user' },
        { status: 400 }
      );
    }

    // Fetch all timesheets
    const { data: timesheets, error: timesheetsError } = await supabase
      .from('timesheets')
      .select(
        `
        id,
        employee_id,
        periodo_ini,
        periodo_fim,
        status,
        employee:employees(*),
        vessel:vessels(*),
        entries:timesheet_entries(*)
      `
      )
      .in('id', timesheetIds);

    if (timesheetsError || !timesheets) {
      return NextResponse.json(
        { error: 'Failed to fetch timesheets', details: timesheetsError?.message },
        { status: 500 }
      );
    }

    // Generate invoices for all timesheets
    const invoices = await Promise.all(
      timesheets.map(async (timesheet) => {
        const request = {
          timesheet_id: timesheet.id,
          tenant_id: tenantId,
          environment_slug: 'omega',
          employee_id: timesheet.employee_id,
          period_start: timesheet.periodo_ini,
          period_end: timesheet.periodo_fim,
        };
        return generateOmegaInvoice(request, timesheet);
      })
    );

    // Export all invoices
    const exported = exportOmegaInvoices(invoices, { format });

    const contentType = format === 'json'
      ? 'application/json'
      : format === 'csv'
      ? 'text/csv'
      : 'application/pdf';

    const filename = `omega-invoices-batch-${new Date().toISOString().split('T')[0]}.${format}`;

    // Convert to string if needed
    const batchResponseBody = typeof exported === 'string' ? exported : JSON.stringify(exported);

    return new NextResponse(batchResponseBody, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('OMEGA batch invoice export error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate OMEGA invoices', details: message },
      { status: 500 }
    );
  }
}

