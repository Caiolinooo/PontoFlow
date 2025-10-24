import {NextRequest, NextResponse} from 'next/server';
import {requireApiAuth} from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getEffectivePeriodLock } from '@/lib/periods/resolver';
import { logAudit } from '@/lib/audit/logger';
import {z} from 'zod';

const Schema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo: z.enum(['embarque', 'desembarque', 'translado', 'onshore', 'offshore', 'folga']),
  hora_ini: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal('')).nullable().optional().transform(v => v === '' ? null : v),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal('')).nullable().optional().transform(v => v === '' ? null : v),
  observacao: z.string().max(1000).or(z.literal('')).nullable().optional().transform(v => v === '' ? null : v)
});

export async function POST(req: NextRequest, context: {params: Promise<{id: string}>}) {
  try {
    console.log('🔵 POST /api/employee/timesheets/[id]/entries - START');
    const user = await requireApiAuth();
    console.log('🔵 User authenticated:', user.id);

    const {id} = await context.params;
    console.log('🔵 Timesheet ID:', id);

    const json = await req.json().catch(() => ({}));
    console.log('🔵 Request body:', json);

    const parsed = Schema.safeParse(json);
    if (!parsed.success) {
      console.error('❌ Invalid body:', parsed.error.issues);
      return NextResponse.json({error: 'invalid_body', issues: parsed.error.issues}, {status: 400});
    }

    const supabase = getServiceSupabase();
    console.log('🔵 Supabase service client created (bypassing RLS)');

    // Get timesheet and check ownership + lock
    console.log('🔵 Fetching timesheet...');
    const {data: ts, error: eTs} = await supabase
      .from('timesheets')
      .select('id, tenant_id, periodo_ini, employee_id')
      .eq('id', id)
      .single();

    console.log('🔵 Timesheet query result:', { ts, error: eTs });

    if (eTs || !ts) {
      console.error('❌ Timesheet not found or error:', eTs?.message);
      return NextResponse.json({error: eTs?.message ?? 'not_found'}, {status: 404});
    }

    // Resolve current user's employee record
    console.log('🔵 Fetching employee for user:', user.id, 'tenant:', ts.tenant_id);
    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('tenant_id', ts.tenant_id)
      .eq('profile_id', user.id)
      .limit(1)
      .maybeSingle();

    console.log('🔵 Employee query result:', { emp, error: empError });

    if (empError) {
      console.error('❌ Error fetching employee:', empError);
      return NextResponse.json({ error: 'database_error', details: empError.message }, { status: 500 });
    }

    if (!emp) {
      console.error('❌ Employee not found for user:', user.id);
      return NextResponse.json({ error: 'employee_not_found' }, { status: 404 });
    }

    if (user.role !== 'ADMIN' && ts.employee_id !== emp.id) {
      console.error('❌ Forbidden: timesheet employee_id:', ts.employee_id, 'user employee_id:', emp.id);
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    console.log('✅ Employee verified:', emp.id);

    const monthKey = `${new Date(ts.periodo_ini).getFullYear()}-${String(new Date(ts.periodo_ini).getMonth()+1).padStart(2,'0')}-01`;
    const eff = await getEffectivePeriodLock(supabase, ts.tenant_id, ts.employee_id, monthKey);
    if (eff.locked && user.role !== 'ADMIN') return NextResponse.json({ error: 'period_locked', level: eff.level, reason: eff.reason ?? null }, { status: 400 });

    const { data: insertedEntry, error: insertError } = await supabase
      .from('timesheet_entries')
      .insert({
        tenant_id: ts.tenant_id,
        timesheet_id: id,
        data: parsed.data.data,
        tipo: parsed.data.tipo,
        hora_ini: parsed.data.hora_ini ?? null,
        hora_fim: null,
        observacao: parsed.data.observacao ?? null
      })
      .select('*')
      .single();

    if (insertError || !insertedEntry) {
      return NextResponse.json({error: insertError?.message ?? 'Failed to create entry'}, {status: 400});
    }

    // Audit log (non-blocking)
    await logAudit({
      tenantId: ts.tenant_id,
      userId: user.id,
      action: 'create',
      resourceType: 'timesheet_entry',
      resourceId: insertedEntry.id,
      oldValues: null,
      newValues: {
        timesheet_id: id,
        data: parsed.data.data,
        tipo: parsed.data.tipo,
        hora_ini: parsed.data.hora_ini ?? null,
        hora_fim: null,
      }
    });

    console.log('✅ Entry created successfully:', insertedEntry.id);
    return NextResponse.json({ok: true, entry: insertedEntry});
  } catch (error) {
    console.error('❌ Unexpected error in POST /api/employee/timesheets/[id]/entries:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({error: 'unauthorized'}, {status: 401});
    }
    return NextResponse.json({error: 'internal_error', details: error instanceof Error ? error.message : 'Unknown error'}, {status: 500});
  }
}

