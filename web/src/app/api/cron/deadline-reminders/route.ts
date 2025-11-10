import {NextRequest, NextResponse} from 'next/server';
import {getServiceSupabase} from '@/lib/supabase/service';
import {dispatchNotification} from '@/lib/notifications/dispatcher';
import {getActiveTimesheetPeriod} from '@/lib/periods/calculator';
import crypto from 'crypto';

function fmtDateISO(date: Date) { return date.toISOString().slice(0, 10); }

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

  console.log('[CRON] Starting deadline reminders job');

  // Fetch all tenants with their settings
  const {data: tenants, error: tenantsError} = await supabase
    .from('tenants')
    .select('id, name, timezone, deadline_day');

  if (tenantsError) {
    console.error('[CRON] Error fetching tenants:', tenantsError);
    return NextResponse.json({ok: false, error: tenantsError.message}, {status: 500});
  }

  let totalSentEmployees = 0;
  let totalSentManagers = 0;
  const tenantResults: Record<string, any> = {};

  // Process each tenant separately with their specific deadline configuration
  for (const tenant of tenants ?? []) {
    const tenantTimezone = (tenant.timezone || 'America/Sao_Paulo') as any;
    const deadlineDay = tenant.deadline_day ?? 5;

    console.log(`[CRON] Processing tenant ${tenant.name} (${tenant.id}) - timezone: ${tenantTimezone}, deadline_day: ${deadlineDay}`);

    // Calculate current period for this tenant
    const periodInfo = getActiveTimesheetPeriod(tenantTimezone, deadlineDay);
    const daysLeft = periodInfo.daysUntilDeadline;

    console.log(`[CRON] Tenant ${tenant.name}: Period ${periodInfo.startDate} to ${periodInfo.endDate}, ${daysLeft} days until deadline`);

    // Only send reminders at specific intervals (T-7, T-5, T-3, T-2, T-1, T-0)
    const shouldRun = [7, 5, 3, 2, 1, 0].includes(daysLeft);
    if (!process.env.FORCE_CRON && !shouldRun) {
      console.log(`[CRON] Tenant ${tenant.name}: Skipping (${daysLeft} days left, not in trigger window)`);
      tenantResults[tenant.id] = {skipped: true, daysLeft};
      continue;
    }

    // 1) Gather timesheets for the period and determine pending employees
    const {data: tsAll, error: eTsAll} = await supabase
      .from('timesheets')
      .select('id, tenant_id, employee_id, periodo_ini, periodo_fim, status')
      .eq('tenant_id', tenant.id)
      .eq('periodo_ini', periodInfo.startDate);

    if (eTsAll) {
      console.error(`[CRON] Tenant ${tenant.name}: Error fetching timesheets:`, eTsAll);
      continue;
    }

    const presentByEmployee = new Map<string, {status: string}>();
    for (const t of tsAll ?? []) presentByEmployee.set(t.employee_id, {status: t.status});

    // Employees who are pending = with draft/rejected OR without any timesheet record for the period
    const draftEmployees = new Set((tsAll ?? []).filter(t => t.status === 'rascunho').map(t => t.employee_id));
    const rejectedEmployees = new Set((tsAll ?? []).filter(t => t.status === 'recusado').map(t => t.employee_id));

    // Fetch all employees for this tenant to find those missing timesheet
    const {data: empsAll, error: eEmpAll} = await supabase
      .from('employees')
      .select('id, profile_id, tenant_id')
      .eq('tenant_id', tenant.id);

    if (eEmpAll) {
      console.error(`[CRON] Tenant ${tenant.name}: Error fetching employees:`, eEmpAll);
      continue;
    }

    const missingEmployees = (empsAll ?? [])
      .filter(e => !presentByEmployee.has(e.id))
      .map(e => e.id);

    const employeeIds = [...new Set([
      ...draftEmployees,
      ...rejectedEmployees,
      ...missingEmployees
    ])];

    console.log(`[CRON] Tenant ${tenant.name}: ${employeeIds.length} pending employees (${draftEmployees.size} draft, ${rejectedEmployees.size} rejected, ${missingEmployees.length} missing)`);

    if (employeeIds.length === 0) {
      tenantResults[tenant.id] = {ok: true, sentEmployees: 0, sentManagers: 0, daysLeft};
      continue;
    }

    // 2) Batch fetch employees and profiles for pending set
    const {data: emps, error: eEmp} = await supabase
      .from('employees')
      .select('id, profile_id, tenant_id')
      .in('id', employeeIds);

    if (eEmp) {
      console.error(`[CRON] Tenant ${tenant.name}: Error fetching employee details:`, eEmp);
      continue;
    }

    const profileIds = [...new Set((emps ?? []).map(e => e.profile_id))];
    const {data: profs, error: eProf} = await supabase
      .from('profiles')
      .select('user_id, email, display_name, locale')
      .in('user_id', profileIds);

    if (eProf) {
      console.error(`[CRON] Tenant ${tenant.name}: Error fetching profiles:`, eProf);
      continue;
    }

    const profMap = new Map(profs?.map(p => [p.user_id, p] as const));

    // 3) Send employee reminders
    let sentEmployees = 0;
    const periodLabel = `${periodInfo.startDate} - ${periodInfo.endDate}`;

    for (const e of emps ?? []) {
      const p = profMap.get(e.profile_id);
      if (!p?.email) continue;
      try {
        await dispatchNotification({
          type: 'deadline_reminder',
          to: p.email,
          payload: {
            name: p.display_name ?? 'Colaborador',
            periodLabel: periodLabel,
            daysLeft,
            url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/timesheets`,
            locale: (p.locale as 'pt-BR' | 'en-GB') ?? 'pt-BR'
          }
        });
        sentEmployees++;
      } catch (err) {
        console.error(`[CRON] Tenant ${tenant.name}: Error sending email to ${p.email}:`, err);
      }
    }

    console.log(`[CRON] Tenant ${tenant.name}: Sent ${sentEmployees} employee reminders`);

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
              periodLabel: periodLabel,
              employees,
              locale: (m.locale as 'pt-BR' | 'en-GB') ?? 'pt-BR'
            }
          });
          sentManagers++;
        } catch (err) {
          console.error(`[CRON] Tenant ${tenant.name}: Error sending manager email to ${m.email}:`, err);
        }
      }
    }

    console.log(`[CRON] Tenant ${tenant.name}: Sent ${sentManagers} manager reminders`);

    totalSentEmployees += sentEmployees;
    totalSentManagers += sentManagers;
    tenantResults[tenant.id] = {ok: true, sentEmployees, sentManagers, daysLeft};
  }

  console.log(`[CRON] Deadline reminders complete: ${totalSentEmployees} employees, ${totalSentManagers} managers`);

  return NextResponse.json({
    ok: true,
    totalSentEmployees,
    totalSentManagers,
    tenantResults
  });
}

