import {NextRequest, NextResponse} from 'next/server';
import {requireApiRole} from '@/lib/auth/server';
import {getServiceSupabase} from '@/lib/supabase/server';
import {dispatchNotification} from '@/lib/notifications/dispatcher';
import { dispatchEnhancedNotification } from '@/lib/notifications/in-app-dispatcher';
import { logAudit } from '@/lib/audit/logger';

export async function POST(_req: NextRequest, context: {params: Promise<{id: string}>}) {
  try {
    const user = await requireApiRole(['ADMIN', 'MANAGER', 'MANAGER_TIMESHEET']);
    const {id} = await context.params;

    const supabase = getServiceSupabase();

    // Fetch timesheet and authorize access by manager groups (unless ADMIN)
    const { data: ts, error: eTs } = await supabase
      .from('timesheets')
      .select('id, employee_id, tenant_id, periodo_ini, periodo_fim')
      .eq('id', id)
      .single();
    if (eTs || !ts) return NextResponse.json({ error: eTs?.message ?? 'not_found' }, { status: 404 });

    if (user.role !== 'ADMIN') {
      const { data: mgrGroups } = await supabase
        .from('manager_group_assignments')
        .select('group_id')
        .eq('tenant_id', ts.tenant_id)
        .eq('manager_id', user.id);
      const groupIds = (mgrGroups ?? []).map(g => g.group_id);
      if (!groupIds.length) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

      const { data: membership } = await supabase
        .from('employee_group_members')
        .select('id')
        .eq('tenant_id', ts.tenant_id)
        .eq('employee_id', ts.employee_id)
        .in('group_id', groupIds)
        .maybeSingle();
      if (!membership) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // Update status to approved
    const {data: updated, error} = await supabase
      .from('timesheets')
      .update({status: 'approved'})
      .eq('id', id)
      .select('id,employee_id,periodo_ini,periodo_fim,tenant_id')
      .single();

    if (error || !updated) return NextResponse.json({error: error?.message ?? 'not_found'}, {status: 400});

    // Insert approval audit row
    await supabase.from('approvals').insert({
      tenant_id: updated.tenant_id,
      timesheet_id: id,
      manager_id: user.id,
      status: 'approved',
      mensagem: null
    });

    // Audit (non-blocking)
    await logAudit({
      tenantId: updated.tenant_id,
      userId: user.id,
      action: 'approve',
      resourceType: 'timesheet',
      resourceId: id,
      oldValues: { prev_status: 'submitted' },
      newValues: { status: 'approved' }
    });

    // Fetch employee profile for email + locale
    const {data: emp, error: e1} = await supabase
      .from('employees')
      .select('id, display_name, profile_id')
      .eq('id', updated.employee_id)
      .single();
    if (e1) return NextResponse.json({error: e1.message}, {status: 500});

    const {data: prof, error: e2} = await supabase
      .from('profiles')
      .select('email, locale')
      .eq('user_id', emp.profile_id)
      .single();
    if (e2) return NextResponse.json({error: e2.message}, {status: 500});

    // Send notifications (both email and in-app)
    try {
      await dispatchEnhancedNotification({
        type: 'timesheet_approved',
        to: prof.email,
        user_id: emp.profile_id,
        payload: {
          employeeName: emp.display_name ?? 'Colaborador',
          managerName: user.name,
          period: `${updated.periodo_ini} - ${updated.periodo_fim}`,
          url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/timesheets/${id}`,
          locale: (prof.locale as 'pt-BR' | 'en-GB') ?? 'pt-BR',
          tenantId: updated.tenant_id,
          email: prof.email
        }
      });
    } catch {}

    return NextResponse.json({ok: true, id});
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({error: 'unauthorized'}, {status: 401});
    }
    return NextResponse.json({error: 'internal_error'}, {status: 500});
  }
}

