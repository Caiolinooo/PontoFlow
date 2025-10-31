import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { dispatchNotification } from '@/lib/notifications/dispatcher';

function parseMonth(month: string): { start: Date; end: Date; label: string } | null {
  if (!/^[0-9]{4}-[0-9]{2}$/.test(month)) return null;
  const [y, m] = month.split('-').map((s) => parseInt(s, 10));
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  const label = `${y}-${String(m).padStart(2, '0')}`;
  return { start, end, label };
}

function daysBetween(a: Date, b: Date) {
  const ms = Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return ms;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN', 'MANAGER', 'MANAGER_TIMESHEET']);
    const supabase = getServiceSupabase();

    const body = await req.json();
    const employeeId: string | undefined = body?.employeeId;
    const month: string | undefined = body?.month;

    if (!employeeId || !month) {
      return NextResponse.json({ error: 'missing_params' }, { status: 400 });
    }

    const period = parseMonth(month);
    if (!period) {
      return NextResponse.json({ error: 'invalid_month' }, { status: 400 });
    }

    // Authorization: ADMIN can notify anyone in tenant; manager must belong to groups that include the employee
    if (user.role !== 'ADMIN') {
      const { data: mgrGroups, error: mgrErr } = await supabase
        .from('manager_group_assignments')
        .select('group_id')
        .eq('manager_id', user.id);
      if (mgrErr) return NextResponse.json({ error: mgrErr.message }, { status: 500 });
      const groupIds = [...new Set((mgrGroups ?? []).map((g: any) => g.group_id))];

      if (groupIds.length === 0) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      const { data: memberships, error: memErr } = await supabase
        .from('employee_group_members')
        .select('employee_id')
        .in('group_id', groupIds);
      if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 });
      const employeeIds = new Set((memberships ?? []).map((m: any) => m.employee_id));
      if (!employeeIds.has(employeeId)) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    }

    // Fetch employee and profile for email/locale
    const { data: employee, error: empErr } = await supabase
      .from('employees')
      .select('id, tenant_id, profile_id, display_name')
      .eq('id', employeeId)
      .maybeSingle();
    if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 });
    if (!employee) return NextResponse.json({ error: 'employee_not_found' }, { status: 404 });

    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('email, locale, display_name')
      .eq('user_id', employee.profile_id)
      .maybeSingle();
    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });
    if (!profile?.email) return NextResponse.json({ error: 'email_not_found' }, { status: 404 });

    const now = new Date();
    const daysLeftRaw = daysBetween(now, period.end);
    const daysLeft = Math.max(0, daysLeftRaw);

    // Build locale-aware URL to employee timesheets list
    const locale = (profile.locale === 'en-GB' ? 'en-GB' : 'pt-BR') as 'pt-BR' | 'en-GB';
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const url = `${basePath}/${locale}/employee/timesheets`;

    await dispatchNotification({
      type: 'deadline_reminder',
      to: profile.email,
      payload: {
        name: (employee.display_name as any) || profile.display_name || 'Colaborador',
        periodLabel: period.label,
        daysLeft,
        url,
        locale,
      },
    });

    // Optional: best-effort log into notification_log if available (ignore errors)
    try {
      await supabase.from('notification_log').insert({
        user_id: employee.profile_id,
        type: 'email',
        title: 'deadline_reminder',
        body: `Reminder for period ${period.label}`,
        data: { employeeId, month, triggeredBy: user.id },
      } as any);
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      const status = e.message === 'Unauthorized' ? 401 : 403;
      return NextResponse.json({ error: e.message.toLowerCase() }, { status });
    }
    console.error('Error in notify-employee:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

