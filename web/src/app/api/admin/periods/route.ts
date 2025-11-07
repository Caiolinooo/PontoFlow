import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { calculateTimesheetPeriods } from '@/lib/periods/calculator';
import { TimezoneType } from '@/lib/timezone/utils';

function firstDayOfMonth(isoDate: string): string {
  // Accepts 'YYYY-MM' or 'YYYY-MM-01' or full 'YYYY-MM-DD'
  const d = new Date(isoDate.length === 7 ? `${isoDate}-01` : isoDate);
  const fd = new Date(d.getFullYear(), d.getMonth(), 1);
  const y = fd.getFullYear();
  const m = `${fd.getMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}-01`;
}

// Calculate period boundaries based on deadline configuration
function calculatePeriodBoundaries(
  tenantTimezone: TimezoneType,
  deadlineDay: number,
  targetMonth: string // YYYY-MM format
): { startDate: string; endDate: string; month: string } {
  const [year, month] = targetMonth.split('-').map(Number);
  const targetDate = new Date(year, month - 1, 1);
  
  // Get all periods around the target month
  const periods = calculateTimesheetPeriods(
    tenantTimezone,
    deadlineDay,
    new Date(year, month - 2, 1).toISOString().split('T')[0], // Start 2 months before
    new Date(year, month + 1, 1).toISOString().split('T')[0]  // End 1 month after
  );
  
  // Find the period that contains the target month
  const targetPeriod = periods.find(period => {
    const periodStart = new Date(period.startDate);
    const periodEnd = new Date(period.endDate);
    return periodStart <= targetDate && targetDate <= periodEnd;
  });
  
  if (targetPeriod) {
    return {
      startDate: targetPeriod.startDate,
      endDate: targetPeriod.endDate,
      month: targetPeriod.periodKey
    };
  }
  
  // Fallback: use the default calculation
  const now = new Date();
  const currentPeriod = calculateTimesheetPeriods(
    tenantTimezone,
    deadlineDay,
    new Date(year, month - 1, 1).toISOString().split('T')[0],
    new Date(year, month + 1, 1).toISOString().split('T')[0]
  )[0];
  
  return {
    startDate: currentPeriod?.startDate || firstDayOfMonth(targetMonth),
    endDate: currentPeriod?.endDate || `${targetMonth}-31`,
    month: currentPeriod?.periodKey || targetMonth
  };
}

export async function GET() {
  try {
    const user = await requireApiRole(['ADMIN']);
    const supabase = await getServerSupabase();

    // Resolve tenant automatically if there is exactly one; otherwise ask user to choose
    let tenantId = user.tenant_id as string | undefined;
    if (!tenantId) {
      const svc = getServiceSupabase();
      const { data: tenants } = await svc.from('tenants').select('id').limit(2);
      if (tenants && tenants.length === 1) {
        tenantId = tenants[0].id;
        await svc.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
      } else {
        const { data: all } = await svc.from('tenants').select('id, name').order('name');
        return NextResponse.json({ error: 'tenant_required', tenants: all ?? [] }, { status: 409 });
      }
    }

    // Get tenant settings including deadline_day and timezone
    const { data: tenant } = await supabase
      .from('tenants')
      .select('timezone')
      .eq('id', tenantId)
      .single();

    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('deadline_day')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const tenantTimezone = tenant?.timezone || 'America/Sao_Paulo';
    const deadlineDay = settings?.deadline_day ?? 16; // Default to day 16 for ABZ Group

    // Calculate current periods based on tenant deadline configuration
    const now = new Date();
    const currentPeriod = calculateTimesheetPeriods(
      tenantTimezone,
      deadlineDay,
      new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0],
      new Date(now.getFullYear(), now.getMonth() + 3, 1).toISOString().split('T')[0]
    );

    // Get existing locks from period_locks table
    const { data: locks, error } = await supabase
      .from('period_locks')
      .select('id, tenant_id, period_month, locked, reason, updated_at, created_at')
      .eq('tenant_id', tenantId)
      .order('period_month', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Merge calculated periods with locks to provide complete period information
    const periodsWithLocks = currentPeriod.map(period => {
      const lock = locks?.find(l => l.period_month === period.startDate);
      return {
        id: lock?.id || null,
        tenant_id: tenantId,
        period_month: period.startDate,
        period_start: period.startDate,
        period_end: period.endDate,
        period_label: period.label,
        locked: lock?.locked || false,
        reason: lock?.reason || null,
        updated_at: lock?.updated_at || null,
        created_at: lock?.created_at || null
      };
    });

    return NextResponse.json({
      periods: periodsWithLocks,
      actualLocks: locks,
      tenantSettings: {
        timezone: tenantTimezone,
        deadlineDay: deadlineDay
      }
    });
  } catch (err) {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);

    // Resolve tenant automatically if there is exactly one; otherwise ask user to choose
    let tenantId = user.tenant_id as string | undefined;
    const svc = getServiceSupabase();
    if (!tenantId) {
      const { data: tenants } = await svc.from('tenants').select('id').limit(2);
      if (tenants && tenants.length === 1) {
        tenantId = tenants[0].id;
        await svc.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
      } else {
        const { data: all } = await svc.from('tenants').select('id, name').order('name');
        return NextResponse.json({ error: 'tenant_required', tenants: all ?? [] }, { status: 409 });
      }
    }

    const body = await req.json().catch(() => ({} as any));
    const raw = (body?.period_month as string) ?? '';
    const locked = Boolean(body?.locked);
    const reason = (body?.reason as string) ?? null;
    
    // Get tenant settings for deadline configuration
    const supabase = await getServerSupabase();
    const { data: tenant } = await supabase
      .from('tenants')
      .select('timezone')
      .eq('id', tenantId)
      .single();

    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('deadline_day')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const tenantTimezone = tenant?.timezone || 'America/Sao_Paulo';
    const deadlineDay = settings?.deadline_day ?? 16;

    // Calculate actual period boundaries based on deadline configuration
    const targetMonth = raw || new Date().toISOString().slice(0, 7); // Use current month if not provided
    const periodBoundaries = calculatePeriodBoundaries(tenantTimezone, deadlineDay, targetMonth);

    // Use service client to bypass RLS for admin operations
    const serviceClient = getServiceSupabase();

    // Upsert lock for tenant+period using actual period boundaries
    const { data: existing } = await serviceClient
      .from('period_locks')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('period_month', periodBoundaries.startDate)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await serviceClient
        .from('period_locks')
        .update({ locked, reason })
        .eq('id', existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      const { error } = await serviceClient
        .from('period_locks')
        .insert({
          tenant_id: tenantId,
          period_month: periodBoundaries.startDate,
          locked,
          reason
        });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      period: periodBoundaries,
      settings: {
        timezone: tenantTimezone,
        deadlineDay: deadlineDay
      }
    });
  } catch (err) {
    if (err instanceof Error && (err.message === 'Unauthorized' || err.message === 'Forbidden')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

