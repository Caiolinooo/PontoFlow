import {NextRequest, NextResponse} from 'next/server';
import {getServiceSupabase} from '@/lib/supabase/service';
import {dispatchNotification} from '@/lib/notifications/dispatcher';
import crypto from 'crypto';

function firstDayOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function firstDayOfNextMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 1); }
function fmtDateISO(date: Date) { return date.toISOString().slice(0, 10); }
function periodLabel(d: Date) {
  const month = d.toLocaleString('default', {month: 'long'});
  return `${month}/${d.getFullYear()}`;
}

/**
 * Validates cron job authentication using timing-safe comparison
 * Requires CRON_SECRET environment variable
 */
function validateCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[cron] CRON_SECRET not configured. Set CRON_SECRET environment variable.');
    return false;
  }

  // Accept secret from Authorization header (preferred) or X-Cron-Secret header
  const authHeader = request.headers.get('authorization');
  const cronHeader = request.headers.get('x-cron-secret');

  let providedSecret: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    providedSecret = authHeader.substring(7);
  } else if (cronHeader) {
    providedSecret = cronHeader;
  }

  if (!providedSecret) {
    return false;
  }

  // Timing-safe comparison to prevent timing attacks
  try {
    const expectedBuffer = Buffer.from(cronSecret, 'utf8');
    const providedBuffer = Buffer.from(providedSecret, 'utf8');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  // SECURITY: Validate cron authentication
  if (!validateCronAuth(request)) {
    console.warn('[cron] Unauthorized cron request attempt');
    return NextResponse.json({ok: false, error: 'unauthorized'}, {status: 401});
  }

  // Use service role to bypass RLS for global reminders
  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch {
    return NextResponse.json({ok: false, error: 'service_key_missing'}, {status: 500});
  }

  // Determine current period (this month) and deadline (day 1 of next month)
  const now = new Date();
  const periodStart = firstDayOfMonth(now);
  const deadline = firstDayOfNextMonth(now);
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const shouldRun = [7, 5, 3, 2, 1, 0].includes(daysLeft);

  // Gate automated runs by cadence; allow override with FORCE_CRON
  if (!process.env.FORCE_CRON && !shouldRun) {
    return NextResponse.json({ok: true, skipped: true, daysLeft});
  }

  // 1) Gather timesheets for the period and determine pending employees
  const periodStartISO = fmtDateISO(periodStart);
  const {data: tsAll, error: eTsAll} = await supabase
    .from('timesheets')
    .select('id, tenant_id, employee_id, periodo_ini, periodo_fim, status')
    .eq('periodo_ini', periodStartISO);
  if (eTsAll) return NextResponse.json({ok: false, error: eTsAll.message}, {status: 500});

  const presentByEmployee = new Map<string, {status: string}>();
  for (const t of tsAll ?? []) presentByEmployee.set(t.employee_id, {status: t.status});

  // Employees who are pending = with draft OR without any timesheet record for the period
  const draftEmployees = new Set((tsAll ?? []).filter(t => t.status === 'rascunho').map(t => t.employee_id));
  const rejectedEmployees = new Set((tsAll ?? []).filter(t => t.status === 'recusado').map(t => t.employee_id));

  // Fetch all employees to find those missing timesheet
  const {data: empsAll, error: eEmpAll} = await supabase
    .from('employees')
    .select('id, profile_id');
  if (eEmpAll) return NextResponse.json({ok: false, error: eEmpAll.message}, {status: 500});

  const missingEmployees = (empsAll ?? [])
    .filter(e => !presentByEmployee.has(e.id))
    .map(e => e.id);

  const employeeIds = [...new Set([
    ...draftEmployees,
    ...rejectedEmployees,
    ...missingEmployees
  ])];
  if (employeeIds.length === 0) {
    return NextResponse.json({ok: true, sentEmployees: 0, sentManagers: 0, daysLeft});
  }

  // 2) Batch fetch employees and profiles for pending set
  const {data: emps, error: eEmp} = await supabase
    .from('employees')
    .select('id, profile_id')
    .in('id', employeeIds);
  if (eEmp) return NextResponse.json({ok: false, error: eEmp.message}, {status: 500});
  const profileIds = [...new Set((emps ?? []).map(e => e.profile_id))];
  const {data: profs, error: eProf} = await supabase
    .from('profiles')
    .select('user_id, email, display_name, locale')
    .in('user_id', profileIds);
  if (eProf) return NextResponse.json({ok: false, error: eProf.message}, {status: 500});

  const profMap = new Map(profs?.map(p => [p.user_id, p] as const));

  // 3) Send employee reminders
  let sentEmployees = 0;
  const perLabel = periodLabel(periodStart);
  for (const e of emps ?? []) {
    const p = profMap.get(e.profile_id);
    if (!p?.email) continue;
    try {
      await dispatchNotification({
        type: 'deadline_reminder',
        to: p.email,
        payload: {
          name: p.display_name ?? 'Colaborador',
          periodLabel: perLabel,
          daysLeft,
          url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/timesheets`,
          locale: (p.locale as 'pt-BR' | 'en-GB') ?? 'pt-BR'
        }
      });
      sentEmployees++;
    } catch {}
  }

  // 4) Manager consolidated reminders (group-based)
  const {data: egm} = await supabase
    .from('employee_group_members')
    .select('employee_id, group_id')
    .in('employee_id', employeeIds);
  const groupIds = [...new Set((egm ?? []).map(g => g.group_id))];
  const {data: mga} = await supabase
    .from('manager_group_assignments')
    .select('manager_id, group_id')
    .in('group_id', groupIds);

  // Map manager_id -> set of employee_ids pending
  const managerMap = new Map<string, Set<string>>();
  for (const g of egm ?? []) {
    const mgrs = (mga ?? []).filter(m => m.group_id === g.group_id);
    for (const m of mgrs) {
      if (!managerMap.has(m.manager_id)) managerMap.set(m.manager_id, new Set());
      managerMap.get(m.manager_id)!.add(g.employee_id);
    }
  }

  // Fetch managers profiles
  const managerIds = [...managerMap.keys()];
  let sentManagers = 0;
  if (managerIds.length) {
    const {data: mgrProfiles} = await supabase
      .from('profiles')
      .select('user_id, email, display_name, locale')
      .in('user_id', managerIds);

    // Build list of employee names for each manager
    const empNameMap = new Map<string, string>();
    for (const e of emps ?? []) {
      const p = profMap.get(e.profile_id);
      empNameMap.set(e.id, p?.display_name ?? 'Colaborador');
    }

    for (const m of mgrProfiles ?? []) {
      const set = managerMap.get(m.user_id);
      if (!m.email || !set || set.size === 0) continue;
      const employees = [...set].map(id => ({name: empNameMap.get(id) ?? id}));
      try {
        await dispatchNotification({
          type: 'manager_pending_reminder',
          to: m.email,
          payload: {
            managerName: m.display_name ?? 'Gerente',
            periodLabel: perLabel,
            employees,
            locale: (m.locale as 'pt-BR' | 'en-GB') ?? 'pt-BR'
          }
        });
        sentManagers++;
      } catch {}
    }
  }

  return NextResponse.json({ok: true, daysLeft, sentEmployees, sentManagers});
}

