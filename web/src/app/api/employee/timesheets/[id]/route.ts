import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {requireApiAuth} from '@/lib/auth/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(_req: NextRequest, context: {params: Promise<{id: string}>}) {
  try {
    const user = await requireApiAuth();
    const {id} = await context.params;

    const {data: ts, error} = await supabase
      .from('timesheets')
      .select('id,status,periodo_ini,periodo_fim,employee_id,tenant_id')
      .eq('id', id)
      .single();
    if (error || !ts) return NextResponse.json({error: error?.message ?? 'not_found'}, {status: 404});

    // Ownership: current user must be the employee owner of this timesheet
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('tenant_id', ts.tenant_id)
      .eq('profile_id', user.id)
      .maybeSingle();
    if (user.role !== 'ADMIN' && (!emp || ts.employee_id !== emp.id)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const [entriesRes, annotationsRes] = await Promise.all([
      supabase.from('timesheet_entries').select('*').eq('timesheet_id', id).order('data', {ascending: true}),
      supabase.from('timesheet_annotations').select('id, entry_id, field_path, message, created_at').eq('timesheet_id', id).order('created_at', {ascending: true})
    ]);

    return NextResponse.json({
      timesheet: ts,
      entries: entriesRes.data ?? [],
      annotations: annotationsRes.data ?? []
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({error: 'unauthorized'}, {status: 401});
    }
    return NextResponse.json({error: 'internal_error'}, {status: 500});
  }
}

