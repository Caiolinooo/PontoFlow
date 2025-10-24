import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getEffectivePeriodLock } from '@/lib/periods/resolver';
import { z } from 'zod';

const Schema = z.object({
  periodo_ini: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodo_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth();

    if (!user.tenant_id) {
      return NextResponse.json({ error: 'missing_tenant', message: 'Usuário sem tenant definido' }, { status: 400 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
    }

    const ini = new Date(parsed.data.periodo_ini);
    const fim = new Date(parsed.data.periodo_fim);
    if (!(ini instanceof Date) || !(fim instanceof Date) || isNaN(ini.getTime()) || isNaN(fim.getTime()) || ini > fim) {
      return NextResponse.json({ error: 'invalid_period' }, { status: 400 });
    }


    const supabase = getServiceSupabase();

    // Find employee for current user
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('tenant_id', user.tenant_id)
      .eq('profile_id', user.id)
      .limit(1)
      .maybeSingle();

    if (empError) {
      console.error('Error fetching employee:', empError);
      return NextResponse.json({ error: 'database_error' }, { status: 500 });
    }

    if (!employee) {
      return NextResponse.json({ error: 'employee_not_configured' }, { status: 400 });
    }

    // Check effective lock (employee > groups > environments > tenant)
    const firstOfMonth = new Date(parsed.data.periodo_ini);
    const monthKey = `${firstOfMonth.getFullYear()}-${String(firstOfMonth.getMonth()+1).padStart(2,'0')}-01`;
    const eff = await getEffectivePeriodLock(supabase, user.tenant_id, employee.id, monthKey);
    if (eff.locked) {
      return NextResponse.json({ error: 'period_locked', level: eff.level, reason: eff.reason ?? null }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('timesheets')
      .insert({
        tenant_id: user.tenant_id,
        employee_id: employee.id,
        periodo_ini: parsed.data.periodo_ini,
        periodo_fim: parsed.data.periodo_fim,
        status: 'rascunho',
      })
      .select('id')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'insert_failed' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

