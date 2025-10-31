import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getEffectivePeriodLock } from '@/lib/periods/resolver';
import { z } from 'zod';
import { logAudit } from '@/lib/audit/logger';
import { dispatchNotification } from '@/lib/notifications/dispatcher';

const Schema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  environment_id: z.string().uuid(),
  hora_ini: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  observacao: z.string().max(1000).nullable().optional(),
  justification: z.string().max(2000).optional()
});

async function ensureManagerAccess(supabase: any, user: any, timesheetId: string) {
  const { data: ts } = await supabase
    .from('timesheets')
    .select('id, tenant_id, periodo_ini, employee_id')
    .eq('id', timesheetId)
    .single();
  if (!ts) return { error: 'not_found' as const };
  if (user.role === 'ADMIN') return { ts };

  // Check group assignment
  const { data: rel } = await supabase
    .from('employee_group_members')
    .select('group_id')
    .eq('tenant_id', ts.tenant_id)
    .eq('employee_id', ts.employee_id);

  const groupIds = (rel || []).map((r: any) => r.group_id);
  if (!groupIds.length) return { error: 'forbidden' as const };

  const { data: mg } = await supabase
    .from('manager_group_assignments')
    .select('group_id')
    .eq('tenant_id', ts.tenant_id)
    .eq('manager_id', user.id)
    .in('group_id', groupIds)
    .limit(1);

  if (!mg || mg.length === 0) return { error: 'forbidden' as const };
  return { ts };
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiRole(['ADMIN','MANAGER','MANAGER_TIMESHEET']);
    const { id } = await context.params;

    const json = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

    const supabase = getServiceSupabase();
    const { ts, error } = await ensureManagerAccess(supabase, user, id);
    if (error === 'not_found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (error === 'forbidden') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const monthKey = `${new Date(ts!.periodo_ini).getFullYear()}-${String(new Date(ts!.periodo_ini).getMonth()+1).padStart(2,'0')}-01`;
    const eff = await getEffectivePeriodLock(supabase, ts!.tenant_id, ts!.employee_id, monthKey);

    let action: 'create' | 'manager_edit_closed_period' = 'create';
    if (eff.locked && user.role !== 'ADMIN') {
      if (!parsed.data.justification || parsed.data.justification.trim().length < 10) {
        return NextResponse.json({ error: 'justification_required' }, { status: 400 });
      }
      action = 'manager_edit_closed_period';
    }

    // Get environment to extract slug for backward compatibility with 'tipo' field
    const { data: environment, error: envError } = await supabase
      .from('environments')
      .select('slug')
      .eq('id', parsed.data.environment_id)
      .single();

    if (envError || !environment) {
      return NextResponse.json({ error: 'environment_not_found' }, { status: 400 });
    }

    const ins = await supabase
      .from('timesheet_entries')
      .insert({
        tenant_id: ts!.tenant_id,
        timesheet_id: id,
        data: parsed.data.data,
        tipo: environment.slug, // For backward compatibility
        environment_id: parsed.data.environment_id,
        hora_ini: parsed.data.hora_ini ?? null,
        hora_fim: parsed.data.hora_fim ?? null,
        observacao: parsed.data.observacao ?? null
      })
      .select('id')
      .single();
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 400 });

    await logAudit({
      tenantId: ts!.tenant_id,
      userId: user.id,
      action,
      resourceType: 'timesheet_entry',
      resourceId: ins.data?.id ?? null,
      oldValues: null,
      newValues: {
        timesheet_id: id,
        data: parsed.data.data,
        tipo: environment.slug,
        hora_ini: parsed.data.hora_ini ?? null,
        hora_fim: parsed.data.hora_fim ?? null,
        justification: eff.locked ? parsed.data.justification ?? '' : undefined
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    if (action === 'manager_edit_closed_period') {
      try {
        const { data: emp } = await supabase
          .from('employees')
          .select('id, profile_id, display_name')
          .eq('id', ts!.employee_id)
          .single();
        const { data: prof } = await supabase
          .from('profiles')
          .select('email, display_name, locale')
          .eq('user_id', emp?.profile_id)
          .maybeSingle();
        if (prof?.email) {
          await dispatchNotification({
            type: 'timesheet_adjusted',
            to: prof.email,
            payload: {
              employeeName: prof.display_name || emp?.display_name || 'Colaborador',
              managerName: user.name,
              period: `${new Date(ts!.periodo_ini).toISOString().slice(0,10)}`,
              justification: parsed.data.justification ?? '',
              url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/employee/timesheets/${id}`,
              locale: (prof.locale as 'pt-BR' | 'en-GB') ?? 'pt-BR',
              tenantId: ts!.tenant_id
            }
          });
        }
      } catch {}
    }

    return NextResponse.json({ ok: true, id: ins.data?.id });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

