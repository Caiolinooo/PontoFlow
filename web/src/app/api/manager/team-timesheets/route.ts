import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';

// Use BRT timezone (America/Sao_Paulo) for date calculations
function firstDayOfMonth(d: Date) {
  // Create date in BRT timezone
  const brtDate = new Date(d.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  return new Date(brtDate.getFullYear(), brtDate.getMonth(), 1);
}

function fmtDateISO(date: Date) {
  // Convert to BRT timezone first, then format
  const brtDate = new Date(date.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  return brtDate.toISOString().slice(0, 10);
}

/**
 * GET /api/manager/team-timesheets?month=YYYY-MM
 * Returns an overview of the manager team timesheets for the given month.
 * Includes employees with no timesheet (status: 'pendente') and drafts ('rascunho').
 * Admins see all employees in their tenant.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN', 'MANAGER', 'MANAGER_TIMESHEET']);
    const supabase = getServiceSupabase();

    const { searchParams } = new URL(req.url);
    const month = (searchParams.get('month') || '').trim();
    let periodStart: Date;
    if (/^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map((s) => parseInt(s, 10));
      periodStart = new Date(y, m - 1, 1);
    } else {
      // Use BRT timezone for current date calculation
      const nowBRT = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
      periodStart = firstDayOfMonth(nowBRT);
    }
    const periodStartISO = fmtDateISO(periodStart);

    // Resolve employee IDs under visibility
    let employeeIds: string[] = [];

    if (user.role === 'ADMIN') {
      // All employees of tenant
      const { data: emps } = await supabase
        .from('employees')
        .select('id')
        .eq('tenant_id', user.tenant_id as string);
      employeeIds = [...new Set((emps ?? []).map((e: any) => e.id))];
    } else {
      // Employees of manager's delegated groups
      const { data: mgrGroups } = await supabase
        .from('manager_group_assignments')
        .select('group_id')
        .eq('manager_id', user.id);
      const groupIds = [...new Set((mgrGroups ?? []).map((g: any) => g.group_id))];
      if (groupIds.length === 0) {
        return NextResponse.json({ items: [], total: 0 }, { status: 200 });
      }
      const { data: memberships } = await supabase
        .from('employee_group_members')
        .select('employee_id')
        .in('group_id', groupIds);
      employeeIds = [...new Set((memberships ?? []).map((m: any) => m.employee_id))];
      if (employeeIds.length === 0) {
        return NextResponse.json({ items: [], total: 0 }, { status: 200 });
      }
    }

    // Fetch employees info for display
    const { data: empRows } = await supabase
      .from('employees')
      .select('id, display_name, profile_id, tenant_id')
      .in('id', employeeIds);

    // Fetch timesheets for the month
    const { data: tsRows } = await supabase
      .from('timesheets')
      .select('id, employee_id, status, periodo_ini, periodo_fim')
      .eq('periodo_ini', periodStartISO)
      .in('employee_id', employeeIds);

    const tsByEmp = new Map<string, any>();
    for (const t of tsRows ?? []) tsByEmp.set(t.employee_id, t);

    // Count entries per timesheet to differentiate rascunho vs pendente
    const tsIds = (tsRows ?? []).map((t: any) => t.id);
    let countsByTs = new Map<string, number>();
    if (tsIds.length) {
      const { data: counts } = await supabase
        .from('timesheet_entries')
        .select('timesheet_id, id');
      // Filter in memory to avoid RPC; small lists typical per month
      countsByTs = new Map<string, number>();
      for (const e of counts ?? []) {
        if (!tsIds.includes((e as any).timesheet_id)) continue;
        const k = (e as any).timesheet_id as string;
        countsByTs.set(k, (countsByTs.get(k) ?? 0) + 1);
      }
    }

    const items = (empRows ?? []).map((e: any) => {
      const ts = tsByEmp.get(e.id) || null;
      let derived: 'pendente' | 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | null = null;
      let entriesCount = 0;
      if (!ts) {
        derived = 'pendente';
      } else {
        const st = ts.status as string;
        if (st === 'rascunho') {
          entriesCount = countsByTs.get(ts.id) ?? 0;
          derived = 'rascunho'; // Keep rascunho status regardless of entries count
        } else if (st === 'enviado' || st === 'aprovado' || st === 'recusado') {
          derived = st as any;
        } else {
          derived = 'pendente';
        }
      }
      return {
        employee: { id: e.id, display_name: e.display_name ?? null },
        timesheet: ts ? { id: ts.id, periodo_ini: ts.periodo_ini, periodo_fim: ts.periodo_fim } : null,
        status: derived,
        entries: entriesCount
      };
    });

    return NextResponse.json({ items, total: items.length }, { status: 200 });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      const status = e.message === 'Unauthorized' ? 401 : 403;
      return NextResponse.json({ error: e.message.toLowerCase() }, { status });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

