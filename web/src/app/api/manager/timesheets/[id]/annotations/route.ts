import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {requireApiRole} from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

const Schema = z.object({
  annotations: z.array(
    z.object({
      entry_id: z.string().uuid().nullable().optional(),
      field: z.string().nullable().optional(),
      message: z.string().min(1)
    })
  )
});

export async function POST(req: NextRequest, context: {params: Promise<{id: string}>}) {
  try {
    const user = await requireApiRole(['ADMIN', 'MANAGER', 'MANAGER_TIMESHEET']);
    const {id} = await context.params;
    const json = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({error: 'invalid_body', issues: parsed.error.issues}, {status: 400});
    }

    const supabase = await getServerSupabase();
    // Fetch timesheet to get tenant_id and employee_id (for authorization)
    const {data: ts, error: errTs} = await supabase
      .from('timesheets')
      .select('id, tenant_id, employee_id')
      .eq('id', id)
      .single();
    if (errTs || !ts) return NextResponse.json({error: errTs?.message ?? 'not_found'}, {status: 404});

    if (user.role !== 'ADMIN') {
      const { data: mgrGroups } = await supabase
        .from('manager_group_assignments')
        .select('group_id')
        .eq('tenant_id', ts.tenant_id)
        .eq('manager_id', user.id);
      const groupIds = (mgrGroups ?? []).map(g => g.group_id);
      if (!groupIds.length) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

      const { data: membership } = await supabase
        .from('employee_group_members')
        .select('id')
        .eq('tenant_id', ts.tenant_id)
        .eq('employee_id', ts.employee_id)
        .in('group_id', groupIds)
        .maybeSingle();
      if (!membership) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const rows = parsed.data.annotations.map(a => ({
      tenant_id: ts.tenant_id,
      timesheet_id: id,
      entry_id: a.entry_id ?? null,
      field_path: a.field ?? null,
      message: a.message,
      created_by: user.id
    }));
    const {error} = await supabase.from('timesheet_annotations').insert(rows);
    if (error) return NextResponse.json({error: error.message}, {status: 400});

    return NextResponse.json({ok: true, inserted: rows.length});
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({error: 'unauthorized'}, {status: 401});
    }
    return NextResponse.json({error: 'internal_error'}, {status: 500});
  }
}

