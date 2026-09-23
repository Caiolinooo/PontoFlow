import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { fileTimesheetForDp } from '@/lib/dp/delivery';

// GET /api/admin/dp/deliveries?month=YYYY-MM&centro_custo=...&status=...
export async function GET(req: NextRequest) {
  try {
    await requireApiRole(['ADMIN']);
    const supabase = getServiceSupabase();
    const sp = req.nextUrl.searchParams;

    let query = supabase
      .from('dp_deliveries')
      .select(`
        id, timesheet_id, employee_id, centro_custo,
        periodo_ini, periodo_fim, storage_path, status, last_error, updated_at,
        employee:employees(display_name)
      `)
      .order('centro_custo')
      .order('periodo_ini');

    const month = sp.get('month');
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, m] = month.split('-').map(Number);
      const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
      query = query
        .gte('periodo_ini', `${month}-01`)
        .lte('periodo_ini', `${month}-${String(lastDay).padStart(2, '0')}`);
    }
    const centroCusto = sp.get('centro_custo');
    if (centroCusto) query = query.eq('centro_custo', centroCusto);
    const status = sp.get('status');
    if (status === 'pendente' || status === 'entregue') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ deliveries: data ?? [] });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// POST /api/admin/dp/deliveries { timesheetId } - reprocessa geracao e upload
export async function POST(req: NextRequest) {
  try {
    await requireApiRole(['ADMIN']);
    const body = await req.json().catch(() => ({}));
    const timesheetId = body?.timesheetId as string | undefined;
    if (!timesheetId) return NextResponse.json({ error: 'timesheetId_required' }, { status: 400 });

    const result = await fileTimesheetForDp(getServiceSupabase(), timesheetId);
    return NextResponse.json({ ok: result.ok, status: result.status, error: result.error });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
