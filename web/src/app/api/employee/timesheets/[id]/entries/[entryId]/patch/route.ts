import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getEffectivePeriodLock } from '@/lib/periods/resolver';

/**
 * Phase 13: PATCH /api/employee/timesheets/[id]/entries/[entryId]
 * 
 * Allows employee to edit an existing timesheet entry.
 * Only allowed if:
 * - Entry belongs to employee's timesheet
 * - Timesheet is not locked (past deadline or approved)
 * - Entry data is valid
 */

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; entryId: string }> }
) {
  const { id, entryId } = await context.params;
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Validate input
    if (!body.tipo || !body.data || !body.hora_ini || !body.hora_fim) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate time range
    if (body.hora_ini >= body.hora_fim) {
      return NextResponse.json(
        { error: 'hora_ini must be before hora_fim' },
        { status: 400 }
      );
    }

    // Fetch timesheet to verify ownership and status
    const { data: timesheet, error: tsError } = await supabase
      .from('timesheets')
      .select('id, tenant_id, employee_id, status, periodo_ini')
      .eq('id', id)
      .single();

    if (tsError || !timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Check if employee owns this timesheet
    const { data: employee } = await supabase
      .from('employees')
      .select('profile_id')
      .eq('id', timesheet.employee_id)
      .single();

    if (employee?.profile_id !== auth.user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // Check if timesheet is locked
    if (timesheet.status === 'aprovado' || timesheet.status === 'bloqueado') {
      return NextResponse.json(
        { error: 'Timesheet is locked' },
        { status: 400 }
      );
    }

    // Check period lock
    const mk = `${new Date(timesheet.periodo_ini).getFullYear()}-${String(new Date(timesheet.periodo_ini).getMonth()+1).padStart(2,'0')}-01`;
    const eff = await getEffectivePeriodLock(supabase, timesheet.tenant_id, timesheet.employee_id, mk);
    if (eff.locked) {
      return NextResponse.json(
        { error: 'period_locked', level: eff.level, reason: eff.reason ?? null },
        { status: 400 }
      );
    }

    // Check deadline
    const deadline = new Date(timesheet.periodo_ini);
    deadline.setMonth(deadline.getMonth() + 1);
    deadline.setHours(0, 0, 0, 0);

    if (new Date() > deadline && timesheet.status !== 'rascunho') {
      return NextResponse.json(
        { error: 'Past deadline' },
        { status: 400 }
      );
    }

    // Update entry
    const { data: updated, error: updateError } = await supabase
      .from('timesheet_entries')
      .update({
        tipo: body.tipo,
        data: body.data,
        hora_ini: body.hora_ini,
        hora_fim: body.hora_fim,
        comentario: body.comentario || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .eq('timesheet_id', id)
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message ?? 'Update failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, entry: updated });
  } catch (err) {
    console.error('PATCH entry error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

