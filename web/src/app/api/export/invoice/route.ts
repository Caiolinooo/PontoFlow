import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { createClient } from '@supabase/supabase-js';
import { generateInvoice, validateInvoice, invoiceToJSON, invoiceToPDF } from '@/lib/invoice/generator';

export async function POST(req: NextRequest) {
  const user = await requireApiAuth();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { timesheetId, format = 'json' } = await req.json();

    if (!timesheetId) {
      return NextResponse.json({ error: 'timesheetId is required' }, { status: 400 });
    }

    // Get timesheet data
    const { data: timesheet, error: timesheetError } = await supabase
      .from('timesheets')
      .select(
        `
        id, employee_id, periodo_ini, periodo_fim, status,
        employee:employees(id, display_name, hourly_rate),
        entries:timesheet_entries(*)
      `
      )
      .eq('id', timesheetId)
      .single();

    if (timesheetError || !timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Calculate total hours
    const totalHours = timesheet.entries?.reduce((sum: number, entry: { tipo: string }) => {
      if (entry.tipo === 'embarque' || entry.tipo === 'desembarque') {
        return sum + 1;
      }
      return sum;
    }, 0) || 0;

    // Get company data
    const tenantId = user.tenant_id;
    const { data: company } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    // Derive hourly rate from employee relation (can be object or array depending on join)
    const employeeRel = (timesheet as unknown as { employee?: unknown }).employee;
    const hourlyRate = Array.isArray(employeeRel)
      ? ((employeeRel[0] as { hourly_rate?: number })?.hourly_rate ?? 0)
      : ((employeeRel as { hourly_rate?: number } | undefined)?.hourly_rate ?? 0);

    // Generate invoice
    const invoice = generateInvoice(
      {
        timesheetId,
        employeeId: timesheet.employee_id,
        periodStart: timesheet.periodo_ini,
        periodEnd: timesheet.periodo_fim,
        hourlyRate,
        totalHours,
      },
      company
    );

    // Validate invoice
    const validation = validateInvoice(invoice);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invoice validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Return based on format
    if (format === 'pdf') {
      const pdfBytes = invoiceToPDF(invoice);
      const buffer = new ArrayBuffer(pdfBytes.byteLength);
      new Uint8Array(buffer).set(pdfBytes);
      const blob = new Blob([buffer], { type: 'application/pdf' });
      return new NextResponse(blob, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        },
      });
    }

    // Default to JSON
    const json = invoiceToJSON(invoice);
    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.json"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

