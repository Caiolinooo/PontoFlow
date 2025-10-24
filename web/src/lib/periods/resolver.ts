import { SupabaseClient } from '@supabase/supabase-js';

export type EffectiveLock = {
  locked: boolean;
  reason?: string | null;
  level: 'employee' | 'group' | 'environment' | 'tenant' | 'none';
};

/**
 * Resolve effective period lock for an employee and month (YYYY-MM or YYYY-MM-01)
 * Cascade: employee > any group of employee > any environment of those groups > tenant
 */
export async function getEffectivePeriodLock(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  periodMonth: string
): Promise<EffectiveLock> {
  const month = normalizeMonth(periodMonth);

  // Load memberships: groups for employee and their environments
  const [{ data: groups }, { data: tenantLock }] = await Promise.all([
    supabase
      .from('employee_group_members')
      .select('group_id, groups!inner(environment_id)')
      .eq('employee_id', employeeId),
    supabase
      .from('period_locks')
      .select('locked, reason')
      .eq('tenant_id', tenantId)
      .eq('period_month', month)
      .limit(1)
      .maybeSingle(),
  ]);

  const groupIds = (groups || []).map((g: any) => g.group_id);
  const envIds = Array.from(
    new Set(((groups || []).map((g: any) => g.groups?.environment_id).filter(Boolean)))
  );

  // Query overrides in parallel
  const [empLock, groupLocks, envLocks] = await Promise.all([
    supabase
      .from('period_locks_employee')
      .select('locked, reason')
      .eq('tenant_id', tenantId)
      .eq('employee_id', employeeId)
      .eq('period_month', month)
      .limit(1)
      .maybeSingle(),
    groupIds.length
      ? supabase
          .from('period_locks_group')
          .select('locked, reason')
          .eq('tenant_id', tenantId)
          .in('group_id', groupIds)
          .eq('period_month', month)
      : Promise.resolve({ data: [] as any[], error: null }),
    envIds.length
      ? supabase
          .from('period_locks_environment')
          .select('locked, reason')
          .eq('tenant_id', tenantId)
          .in('environment_id', envIds)
          .eq('period_month', month)
      : Promise.resolve({ data: [] as any[], error: null }),
  ] as const);

  // Level: employee
  if (empLock?.data) {
    return { locked: !!empLock.data.locked, reason: empLock.data.reason, level: 'employee' };
  }

  // Level: group (any group override applies; locked wins if any true)
  const groupRows: any[] = (groupLocks as any)?.data || [];
  if (groupRows.length) {
    const locked = groupRows.some((r) => !!r.locked);
    const reason = groupRows.find((r) => !!r.locked)?.reason ?? null;
    return { locked, reason, level: 'group' };
  }

  // Level: environment (any env override applies; locked wins if any true)
  const envRows: any[] = (envLocks as any)?.data || [];
  if (envRows.length) {
    const locked = envRows.some((r) => !!r.locked);
    const reason = envRows.find((r) => !!r.locked)?.reason ?? null;
    return { locked, reason, level: 'environment' };
  }

  // Level: tenant
  if (tenantLock) {
    return { locked: !!tenantLock.locked, reason: tenantLock.reason, level: 'tenant' };
  }

  return { locked: false, level: 'none' };
}

function normalizeMonth(iso: string): string {
  const d = new Date(iso.length === 7 ? `${iso}-01` : iso);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}-01`;
}

