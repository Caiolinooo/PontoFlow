import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { getServerSupabase } from '@/lib/supabase/server';
import { z } from 'zod';

const CreateSchema = z.object({
  employee_id: z.string().uuid(),
  work_schedule: z.enum(['7x7', '14x14', '21x21', '28x28', 'custom']),
  days_on: z.number().int().positive().optional(),
  days_off: z.number().int().positive().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

// GET /api/admin/work-schedules?employee_id=xxx
export async function GET(req: NextRequest) {
  try {
    await requireApiRole(['ADMIN']);
    const { searchParams } = new URL(req.url);
    const employee_id = searchParams.get('employee_id');

    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY ? getServiceSupabase() : await getServerSupabase();

    if (employee_id) {
      // Get schedules for specific employee
      const { data, error } = await svc
        .from('employee_work_schedules')
        .select('*')
        .eq('employee_id', employee_id)
        .order('start_date', { ascending: false });

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ schedules: data ?? [] });
    }

    // Get all schedules with employee info
    const { data, error } = await svc
      .from('employee_work_schedules')
      .select('*, employees(id, profile_id)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Enrich with profile names
    const profileIds = Array.from(new Set((data ?? []).map((s: any) => s.employees?.profile_id).filter(Boolean)));
    let profilesMap: Record<string, { display_name: string | null; email: string | null }> = {};
    
    if (profileIds.length) {
      const { data: profiles } = await svc
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', profileIds);
      
      for (const p of profiles ?? []) {
        profilesMap[p.user_id] = { display_name: (p as any).display_name ?? null, email: p.email ?? null };
      }
    }

    const enriched = (data ?? []).map((s: any) => ({
      ...s,
      employee_name: profilesMap[s.employees?.profile_id]?.display_name || profilesMap[s.employees?.profile_id]?.email || s.employee_id,
    }));

    return NextResponse.json({ schedules: enriched });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// POST /api/admin/work-schedules
export async function POST(req: NextRequest) {
  try {
    await requireApiRole(['ADMIN']);
    const body = await req.json().catch(() => ({}));
    const parsed = CreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
    }

    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY ? getServiceSupabase() : await getServerSupabase();

    // Parse days from schedule if not custom
    let days_on = parsed.data.days_on;
    let days_off = parsed.data.days_off;

    if (parsed.data.work_schedule !== 'custom') {
      const [on, off] = parsed.data.work_schedule.split('x').map(Number);
      days_on = on;
      days_off = off;
    }

    const { data, error } = await svc
      .from('employee_work_schedules')
      .insert({
        employee_id: parsed.data.employee_id,
        work_schedule: parsed.data.work_schedule,
        days_on,
        days_off,
        start_date: parsed.data.start_date,
        end_date: parsed.data.end_date ?? null,
        notes: parsed.data.notes ?? null,
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ schedule: data });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

