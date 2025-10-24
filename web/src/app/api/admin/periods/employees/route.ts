import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';

// GET /api/admin/periods/employees?employee_id=...  -> list locks for an employee (12m or all)
export async function GET(req: NextRequest) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = getServiceSupabase();
  const url = new URL(req.url);
  const employeeId = (url.searchParams.get('employee_id') || '').trim();
  if (!employeeId) return NextResponse.json({ error: 'employee_id_required' }, { status: 400 });

  // Resolve tenant (auto if single, else 409 with tenants list)
  let tenantId = user.tenant_id as string | undefined;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY ? getServiceSupabase() : await getServerSupabase();
  if (!tenantId) {
    const { data: tenants } = await svc.from('tenants').select('id').limit(2);
    if (tenants && tenants.length === 1) {
      tenantId = tenants[0].id as string;
      await svc.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
    } else {
      const { data: all } = await svc.from('tenants').select('id, name').order('name');
      return NextResponse.json({ error: 'tenant_required', tenants: all ?? [] }, { status: 409 });
    }
  }

  const { data, error } = await supabase
    .from('period_locks_employee')
    .select('employee_id, period_month, locked, reason')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .order('period_month', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ locks: data ?? [] });
}

// POST /api/admin/periods/employees  -> upsert lock { employee_id, period_month, locked, reason? }
export async function POST(req: NextRequest) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = getServiceSupabase();
  const body = await req.json().catch(() => ({}));
  const employee_id = (body?.employee_id as string | undefined)?.trim();
  const period_month = (body?.period_month as string | undefined)?.trim();
  const locked = !!body?.locked;
  const reason = (body?.reason as string | undefined) || null;
  if (!employee_id) return NextResponse.json({ error: 'employee_id_required' }, { status: 400 });
  if (!period_month) return NextResponse.json({ error: 'period_month_required' }, { status: 400 });

  // Resolve tenant (auto if single, else 409 with tenants list)
  let tenantId = user.tenant_id as string | undefined;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY ? getServiceSupabase() : await getServerSupabase();
  if (!tenantId) {
    const { data: tenants } = await svc.from('tenants').select('id').limit(2);
    if (tenants && tenants.length === 1) {
      tenantId = tenants[0].id as string;
      await svc.from('users_unified').update({ tenant_id: tenantId }).eq('id', user.id);
    } else {
      const { data: all } = await svc.from('tenants').select('id, name').order('name');
      return NextResponse.json({ error: 'tenant_required', tenants: all ?? [] }, { status: 409 });
    }
  }

  // upsert
  const { error } = await supabase
    .from('period_locks_employee')
    .upsert({ tenant_id: tenantId, employee_id, period_month, locked, reason }, { onConflict: 'tenant_id,employee_id,period_month' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

