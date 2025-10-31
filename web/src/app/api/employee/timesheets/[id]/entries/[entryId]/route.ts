import {NextRequest, NextResponse} from 'next/server';
import {requireApiAuth} from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getEffectivePeriodLock } from '@/lib/periods/resolver';
import { logAudit } from '@/lib/audit/logger';
import {z} from 'zod';

const PatchSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  environment_id: z.string().uuid().optional(),
  hora_ini: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  observacao: z.string().max(1000).nullable().optional()
});

export async function PATCH(req: NextRequest, context: {params: Promise<{id: string; entryId: string}>}) {
  try {
    const user = await requireApiAuth();
    const {id, entryId} = await context.params;

    const json = await req.json().catch(() => ({}));
    const parsed = PatchSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({error: 'invalid_body', issues: parsed.error.issues}, {status: 400});

    // Check ownership + period lock via timesheet
    const supabase = getServiceSupabase();
    const { data: ts } = await supabase
      .from('timesheets')
      .select('tenant_id, periodo_ini, employee_id')
      .eq('id', id)
      .single();
    if (!ts) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // Ownership: employee can only edit own timesheet; ADMIN bypass
    if (user.role !== 'ADMIN') {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('tenant_id', ts.tenant_id)
        .eq('profile_id', user.id)
        .maybeSingle();
      if (!emp || ts.employee_id !== emp.id) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    }

    const mk = `${new Date(ts.periodo_ini).getFullYear()}-${String(new Date(ts.periodo_ini).getMonth()+1).padStart(2,'0')}-01`;
    const eff = await getEffectivePeriodLock(supabase, ts.tenant_id, ts.employee_id, mk);
    if (eff.locked && user.role !== 'ADMIN') return NextResponse.json({ error: 'period_locked', level: eff.level, reason: eff.reason ?? null }, { status: 400 });

    // If environment_id is being updated, also update tipo for backward compatibility
    const updateData: any = { ...parsed.data };
    if (parsed.data.environment_id) {
      const { data: environment } = await supabase
        .from('environments')
        .select('slug')
        .eq('id', parsed.data.environment_id)
        .single();
      if (environment) {
        updateData.tipo = environment.slug;
      }
    }

    const {error} = await supabase
      .from('timesheet_entries')
      .update(updateData)
      .eq('id', entryId)
      .eq('timesheet_id', id);
    if (error) return NextResponse.json({error: error.message}, {status: 400});

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({error: 'unauthorized'}, {status: 401});
    }
    return NextResponse.json({error: 'internal_error'}, {status: 500});
  }
}

export async function DELETE(_req: NextRequest, context: {params: Promise<{id: string; entryId: string}>}) {
  try {
    const user = await requireApiAuth();
    const {id, entryId} = await context.params;

    const supabase = getServiceSupabase();
    // Ownership + lock via timesheet before delete
    const { data: ts2 } = await supabase
      .from('timesheets')
      .select('tenant_id, periodo_ini, employee_id')
      .eq('id', id)
      .single();
    if (!ts2) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (user.role !== 'ADMIN') {
      const { data: emp2 } = await supabase
        .from('employees')
        .select('id')
        .eq('tenant_id', ts2.tenant_id)
        .eq('profile_id', user.id)
        .maybeSingle();
      if (!emp2 || ts2.employee_id !== emp2.id) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    }

    const mk2 = `${new Date(ts2.periodo_ini).getFullYear()}-${String(new Date(ts2.periodo_ini).getMonth()+1).padStart(2,'0')}-01`;
    const eff2 = await getEffectivePeriodLock(supabase, ts2.tenant_id, ts2.employee_id, mk2);
    if (eff2.locked && user.role !== 'ADMIN') return NextResponse.json({ error: 'period_locked', level: eff2.level, reason: eff2.reason ?? null }, { status: 400 });

    const {error} = await supabase
      .from('timesheet_entries')
      .delete()
      .eq('id', entryId)
      .eq('timesheet_id', id);
    if (error) return NextResponse.json({error: error.message}, {status: 400});

    // Audit log (non-blocking)
    await logAudit({
      tenantId: ts2.tenant_id,
      userId: (await requireApiAuth()).id,
      action: 'delete',
      resourceType: 'timesheet_entry',
      resourceId: entryId,
      oldValues: null,
      newValues: null
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({error: 'unauthorized'}, {status: 401});
    }
    return NextResponse.json({error: 'internal_error'}, {status: 500});
  }
}

