import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {requireApiRole} from '@/lib/auth/server';
import {getServiceSupabase} from '@/lib/supabase/server';
import {dispatchNotification} from '@/lib/notifications/dispatcher';
import { dispatchEnhancedNotification } from '@/lib/notifications/in-app-dispatcher';
import { logAudit } from '@/lib/audit/logger';

const Schema = z.object({
  reason: z.string().min(3),
  annotations: z
    .array(
      z.object({
        entry_id: z.string().uuid().optional(),
        field: z.string().optional(),
        message: z.string().min(1)
      })
    )
    .optional()
});

export async function POST(req: NextRequest, context: {params: Promise<{id: string}>}) {
  try {
    const user = await requireApiRole(['ADMIN', 'MANAGER', 'MANAGER_TIMESHEET']);
    const {id} = await context.params;
    const json = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({error: 'invalid_body', issues: parsed.error.issues}, {status: 400});
    }

    const supabase = getServiceSupabase();

    // Fetch timesheet and authorize
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

    // Update status to recusado (rejected)
    const {data: updated, error} = await supabase
      .from('timesheets')
      .update({status: 'recusado'}) // Portuguese enum value as per database schema
      .eq('id', id)
      .select('id,employee_id,periodo_ini,periodo_fim,tenant_id')
      .single();
    if (error) {
      console.error('[reject] Failed to update timesheet status:', error.message);
      return NextResponse.json({error: error.message}, {status: 400});
    }

    // Insert approval record (recusado)
    await supabase.from('approvals').insert({
      tenant_id: updated.tenant_id,
      timesheet_id: id,
      manager_id: user.id,
      status: 'recusado', // Portuguese enum value
      mensagem: parsed.data.reason
    });

    // Persist annotations if provided
    if (parsed.data.annotations?.length) {
      const rows = parsed.data.annotations.map(a => ({
        tenant_id: updated.tenant_id,
        timesheet_id: id,
        entry_id: a.entry_id ?? null,
        field_path: a.field ?? null,
        message: a.message,
        created_by: user.id
      }));
      const {error: eAnn} = await supabase.from('timesheet_annotations').insert(rows);
      if (eAnn) {
        console.error('[reject] Failed to insert annotations:', eAnn.message);
        return NextResponse.json({error: eAnn.message}, {status: 500});
      }
    }

    // Audit (non-blocking)
    await logAudit({
      tenantId: updated.tenant_id,
      userId: user.id,
      action: 'reject',
      resourceType: 'timesheet',
      resourceId: id,
      oldValues: { prev_status: 'enviado' }, // Portuguese enum value
      newValues: { status: 'recusado', reason: parsed.data.reason, annotations: parsed.data.annotations ?? [] } // Portuguese enum value
    });

    // Fetch employee + profile for email + locale
    const {data: emp, error: e1} = await supabase
      .from('employees')
      .select('id, profile_id')
      .eq('id', updated.employee_id)
      .single();
    if (e1 || !emp) {
      console.error('[reject] Failed to fetch employee:', e1?.message);
      return NextResponse.json({error: e1?.message ?? 'employee_not_found'}, {status: 500});
    }

    const {data: prof, error: e2} = await supabase
      .from('profiles')
      .select('display_name, email, locale')
      .eq('user_id', emp.profile_id)
      .single();
    if (e2 || !prof) {
      console.error('[reject] Failed to fetch profile:', e2?.message);
      return NextResponse.json({error: e2?.message ?? 'profile_not_found'}, {status: 500});
    }

    // Notify employee (both email and in-app)
    try {
      await dispatchEnhancedNotification({
        type: 'timesheet_rejected',
        to: prof.email,
        user_id: emp.profile_id,
        payload: {
          employeeName: prof.display_name ?? 'Colaborador',
          managerName: user.name,
          period: `${updated.periodo_ini} - ${updated.periodo_fim}`,
          reason: parsed.data.reason,
          annotations: parsed.data.annotations?.map(a => ({field: a.field, message: a.message})) ?? [],
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

