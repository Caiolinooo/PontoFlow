import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';

/**
 * Phase 15: Export Endpoint
 *
 * GET /api/export?format=json|csv&period=2025-10
 *
 * Exports timesheet data with full tenant isolation.
 * Supports JSON (normalized) and CSV (quick-use) formats.
 */

export async function GET(req: NextRequest) {
  const user = await requireApiAuth();
  const supabase = getServiceSupabase();

  try {
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'json';
    const period = url.searchParams.get('period');

    if (!['json', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Use json or csv' },
        { status: 400 }
      );
    }

    // Get user's tenant
    const tenantId = user.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant assigned' }, { status: 400 });
    }

    // Fetch timesheets
    let query = supabase
      .from('timesheets')
      .select('*')
      .eq('tenant_id', tenantId);

    if (period) {
      query = query.ilike('periodo_ini', `${period}%`);
    }

    const { data: timesheets, error: tsError } = await query;

    if (tsError) {
      return NextResponse.json({ error: tsError.message }, { status: 400 });
    }

    // Fetch entries
    const timesheetIds = timesheets?.map((ts: Timesheet) => ts.id) || [];
    let entries: Entry[] = [];

    if (timesheetIds.length > 0) {
      const { data: entriesData, error: entriesError } = await supabase
        .from('timesheet_entries')
        .select('*')
        .in('timesheet_id', timesheetIds);

      if (entriesError) {
        return NextResponse.json({ error: entriesError.message }, { status: 400 });
      }

      entries = (entriesData as Entry[]) || [];
    }

    // Fetch approvals (optional - table may not exist in all environments)
    let approvals: Approval[] = [];
    if (timesheetIds.length > 0) {
      const { data: approvalsData, error: approvalsError } = await supabase
        .from('approvals')
        .select('*')
        .in('timesheet_id', timesheetIds);

      // Only fail if it's not a "table doesn't exist" error
      if (approvalsError && !approvalsError.message.includes('does not exist')) {
        return NextResponse.json({ error: approvalsError.message }, { status: 400 });
      }

      approvals = (approvalsData as Approval[]) || [];
    }

    if (format === 'json') {
      return NextResponse.json({
        version: 'v1',
        tenant_id: tenantId,
        exported_at: new Date().toISOString(),
        data: {
          timesheets: timesheets || [],
          entries,
          approvals
        }
      });
    }

    // CSV format
    const csvContent = generateCSV(timesheets || [], entries, approvals);
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="timesheet-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface Timesheet {
  id: string;
  employee_id: string;
  periodo_ini: string;
  periodo_fim: string;
  status: string;
}

interface Entry {
  id: string;
  timesheet_id: string;
  tipo: string;
  data: string;
  hora_ini: string;
  hora_fim: string;
  comentario?: string;
}

interface Approval {
  id: string;
  timesheet_id: string;
  manager_id: string;
  status: string;
  mensagem?: string;
}

function generateCSV(timesheets: Timesheet[], entries: Entry[], approvals: Approval[]): string {
  const headers = [
    'timesheet_id',
    'employee_id',
    'periodo_ini',
    'periodo_fim',
    'status',
    'entry_id',
    'tipo',
    'data',
    'hora_ini',
    'hora_fim',
    'comentario',
    'approval_id',
    'manager_id',
    'approval_status',
    'approval_mensagem'
  ];

  const rows: string[] = [headers.map(h => `"${h}"`).join(',')];

  timesheets.forEach(ts => {
    const tsEntries = entries.filter(e => e.timesheet_id === ts.id);
    const tsApprovals = approvals.filter(a => a.timesheet_id === ts.id);

    if (tsEntries.length === 0) {
      rows.push([
        ts.id,
        ts.employee_id,
        ts.periodo_ini,
        ts.periodo_fim,
        ts.status,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ].map(v => `"${v}"`).join(','));
    } else {
      tsEntries.forEach((entry, idx) => {
        const approval = tsApprovals[idx] || {};
        rows.push([
          ts.id,
          ts.employee_id,
          ts.periodo_ini,
          ts.periodo_fim,
          ts.status,
          entry.id,
          entry.tipo,
          entry.data,
          entry.hora_ini,
          entry.hora_fim,
          entry.comentario || '',
          approval.id || '',
          approval.manager_id || '',
          approval.status || '',
          approval.mensagem || ''
        ].map(v => `"${v}"`).join(','));
      });
    }
  });

  return rows.join('\n');
}

