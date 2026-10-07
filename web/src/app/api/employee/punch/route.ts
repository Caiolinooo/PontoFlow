import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { PunchError, recordPunch, todayPunch } from '@/lib/integration/v1/punches';

export const dynamic = 'force-dynamic';

async function employeeOf(userId: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('employees')
    .select('id, tenant_id, external_id, active')
    .eq('profile_id', userId);
  if (error) throw new Error(error.message);
  const rows = (data || []) as { id: string; tenant_id: string; external_id: string | null; active: boolean | null }[];
  return rows.find((row) => row.external_id) || null;
}

function punchError(error: unknown) {
  if (error instanceof PunchError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  if (error instanceof Error && error.message === 'Unauthorized') {
    return NextResponse.json({ error: { code: 'unauthorized', message: 'Unauthorized' } }, { status: 401 });
  }
  console.error('[employee/punch]', error);
  return NextResponse.json({ error: { code: 'internal_error', message: 'Internal server error' } }, { status: 500 });
}

/** Batida na UI do ponto.groupabz.com. Mesma recordPunch da Integration API. */
export async function GET() {
  try {
    const user = await requireApiAuth();
    const emp = await employeeOf(user.id);
    if (!emp?.external_id) {
      return NextResponse.json(
        { error: { code: 'not_found', message: 'Colaborador sem vínculo externalId' } },
        { status: 409 },
      );
    }
    const supabase = getServiceSupabase();
    const today = await todayPunch(supabase, emp.tenant_id, emp.external_id);
    return NextResponse.json(today);
  } catch (error) {
    return punchError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const body = await req.json().catch(() => ({}));
    const kind = body?.kind === 'in' || body?.kind === 'out' ? body.kind : null;
    if (!kind) {
      return NextResponse.json({ error: { code: 'invalid_body', message: 'kind must be in or out' } }, { status: 400 });
    }
    const emp = await employeeOf(user.id);
    if (!emp?.external_id) {
      return NextResponse.json(
        { error: { code: 'not_found', message: 'Colaborador sem vínculo externalId' } },
        { status: 409 },
      );
    }
    const supabase = getServiceSupabase();
    const punch = await recordPunch(supabase, emp.tenant_id, {
      externalId: emp.external_id,
      kind,
      at: new Date().toISOString(),
      source: 'web',
    });
    return NextResponse.json(punch, { status: 201 });
  } catch (error) {
    return punchError(error);
  }
}
