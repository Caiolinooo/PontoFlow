import {NextRequest, NextResponse} from 'next/server';
import {requireApiAuth} from '@/lib/auth/server';
import {dispatchNotification} from '@/lib/notifications/dispatcher';
import { getServerSupabase } from '@/lib/supabase/server';
import { getEffectivePeriodLock } from '@/lib/periods/resolver';

export async function POST(_req: NextRequest, context: {params: Promise<{id: string}>}) {
  try {
    const user = await requireApiAuth();
    const {id} = await context.params;

    const supabase = await getServerSupabase();
    // Fetch timesheet first and check period lock
    const { data: ts0, error: e0 } = await supabase
      .from('timesheets')
      .select('id, tenant_id, employee_id, periodo_ini, periodo_fim')
      .eq('id', id)
      .single();
    if (e0 || !ts0) {
      return NextResponse.json({ error: e0?.message ?? 'not_found' }, { status: 404 });
    }

    const mk = `${new Date(ts0.periodo_ini).getFullYear()}-${String(new Date(ts0.periodo_ini).getMonth()+1).padStart(2,'0')}-01`;
    const eff = await getEffectivePeriodLock(supabase, ts0.tenant_id, ts0.employee_id, mk);
    if (eff.locked) return NextResponse.json({ error: 'period_locked', level: eff.level, reason: eff.reason ?? null }, { status: 400 });

    // Ownership: allow only owner or ADMIN to submit
    if (user.role !== 'ADMIN') {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('tenant_id', ts0.tenant_id)
        .eq('profile_id', user.id)
        .maybeSingle();
      if (!emp || ts0.employee_id !== emp.id) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    }

    // Update status to 'enviado' now that lock passed
    const { data: ts, error } = await supabase
      .from('timesheets')
      .update({ status: 'enviado' })
      .eq('id', id)
      .select('id, tenant_id, employee_id, periodo_ini, periodo_fim')
      .single();

    if (error || !ts) {
      return NextResponse.json({ error: error?.message ?? 'not_found' }, { status: 400 });
    }

    // Fetch employee and profile
    const {data: emp} = await supabase
      .from('employees')
      .select('id, display_name, profile_id')
      .eq('id', ts.employee_id)
      .single();
    const {data: empProfile} = await supabase
      .from('profiles')
      .select('user_id, display_name, email, locale')
      .eq('user_id', emp?.profile_id)
      .single();

    // Managers for this employee via groups
    const {data: egm} = await supabase
      .from('employee_group_members')
      .select('group_id')
      .eq('employee_id', ts.employee_id);
    const groupIds = [...new Set((egm ?? []).map(g => g.group_id))];
    const {data: mga} = await supabase
      .from('manager_group_assignments')
      .select('manager_id, group_id')
      .in('group_id', groupIds);
    const managerIds = [...new Set((mga ?? []).map(m => m.manager_id))];

    if (managerIds.length) {
      const {data: mgrProfiles} = await supabase
        .from('profiles')
        .select('user_id, email, display_name, locale')
        .in('user_id', managerIds);

      for (const m of mgrProfiles ?? []) {
        if (!m.email) continue;
        try {
          await dispatchNotification({
            type: 'timesheet_submitted',
            to: m.email,
            payload: {
              employeeName: empProfile?.display_name ?? emp?.display_name ?? 'Colaborador',
              period: `${ts.periodo_ini} - ${ts.periodo_fim}`,
              url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/manager/timesheets/${ts.id}`,
              locale: (m.locale as 'pt-BR' | 'en-GB') ?? 'pt-BR',
              tenantId: ts.tenant_id
            }
          });
        } catch {}
      }
    }

    return NextResponse.json({ok: true, id});
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({error: 'unauthorized'}, {status: 401});
    }
    return NextResponse.json({error: 'internal_error'}, {status: 500});
  }
}

