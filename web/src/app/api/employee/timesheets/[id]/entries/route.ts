import {NextRequest, NextResponse} from 'next/server';
import {requireApiAuth} from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getEffectivePeriodLock } from '@/lib/periods/resolver';
import { logAudit } from '@/lib/audit/logger';
import {z} from 'zod';

const Schema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo: z.enum(['embarque', 'desembarque', 'translado', 'onshore', 'offshore', 'folga']),
  hora_ini: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  observacao: z.string().max(1000).nullable().optional()
});

export async function POST(req: NextRequest, context: {params: Promise<{id: string}>}) {
  try {
    const user = await requireApiAuth();
    const {id} = await context.params;

    const json = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({error: 'invalid_body', issues: parsed.error.issues}, {status: 400});
    }

    const supabase = await getServerSupabase();

    // Get timesheet and check ownership + lock
    const {data: ts, error: eTs} = await supabase
      .from('timesheets')
      .select('id, tenant_id, periodo_ini, employee_id')
      .eq('id', id)
      .single();
    if (eTs || !ts) return NextResponse.json({error: eTs?.message ?? 'not_found'}, {status: 404});

    // Resolve current user's employee record
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('tenant_id', ts.tenant_id)
      .eq('profile_id', user.id)
      .maybeSingle();
    if (user.role !== 'ADMIN' && (!emp || ts.employee_id !== emp.id)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const monthKey = `${new Date(ts.periodo_ini).getFullYear()}-${String(new Date(ts.periodo_ini).getMonth()+1).padStart(2,'0')}-01`;
    const eff = await getEffectivePeriodLock(supabase, ts.tenant_id, ts.employee_id, monthKey);
    if (eff.locked && user.role !== 'ADMIN') return NextResponse.json({ error: 'period_locked', level: eff.level, reason: eff.reason ?? null }, { status: 400 });

    const insertRes = await supabase
      .from('timesheet_entries')
      .insert({
        tenant_id: ts.tenant_id,
        timesheet_id: id,
        data: parsed.data.data,
        tipo: parsed.data.tipo,
        hora_ini: parsed.data.hora_ini ?? null,
        hora_fim: parsed.data.hora_fim ?? null,
        observacao: parsed.data.observacao ?? null
      })
      .select('id')
      .single();
    if (insertRes.error) return NextResponse.json({error: insertRes.error.message}, {status: 400});

    // Audit log (non-blocking)
    await logAudit({
      tenantId: ts.tenant_id,
      userId: user.id,
      action: 'create',
      resourceType: 'timesheet_entry',
      resourceId: insertRes.data?.id ?? null,
      oldValues: null,
      newValues: {
        timesheet_id: id,
        data: parsed.data.data,
        tipo: parsed.data.tipo,
        hora_ini: parsed.data.hora_ini ?? null,
        hora_fim: parsed.data.hora_fim ?? null,
      }
    });

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({error: 'unauthorized'}, {status: 401});
    }
    return NextResponse.json({error: 'internal_error'}, {status: 500});
  }
}

