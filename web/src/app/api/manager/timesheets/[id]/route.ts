import {NextRequest, NextResponse} from 'next/server';
import {requireApiAuth} from '@/lib/auth/server';
import {getServiceSupabase} from '@/lib/supabase/server';

export async function GET(_req: NextRequest, context: {params: Promise<{id: string}>}) {
  try {
    await requireApiAuth();
    const {id} = await context.params;
    const supabase = getServiceSupabase();

    // Fetch basic timesheet and rely on RLS for access control
    const {data: ts, error} = await supabase
      .from('timesheets')
      .select('id,status,periodo_ini,periodo_fim,employee_id,tenant_id')
      .eq('id', id)
      .single();

    if (error || !ts) {
      return NextResponse.json({error: error?.message ?? 'not_found'}, {status: 404});
    }

    // Fetch related data
    const [entriesRes, annotationsRes, approvalsRes, employeeRes] = await Promise.all([
      supabase.from('timesheet_entries').select('*').eq('timesheet_id', id).order('data', {ascending: true}),
      supabase
        .from('timesheet_annotations')
        .select('id, entry_id, field_path, message, created_at')
        .eq('timesheet_id', id)
        .order('created_at', {ascending: true}),
      supabase
        .from('approvals')
        .select('id, manager_id, status, mensagem, created_at')
        .eq('timesheet_id', id)
        .order('created_at', {ascending: true}),
      supabase.from('employees').select('id, display_name, profile_id, cargo').eq('id', ts.employee_id).single()
    ]);

    // Fetch employee profile for locale/email
    const profileQ = employeeRes.data?.profile_id
      ? await supabase
          .from('profiles')
          .select('user_id, display_name, email, locale')
          .eq('user_id', employeeRes.data.profile_id)
          .single()
      : {data: null};

    return NextResponse.json(
      {
        timesheet: ts,
        employee: employeeRes.data,
        profile: profileQ.data,
        entries: entriesRes.data ?? [],
        annotations: annotationsRes.data ?? [],
        approvals: approvalsRes.data ?? []
      },
      {status: 200}
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({error: 'unauthorized'}, {status: 401});
    }
    return NextResponse.json({error: 'internal_error'}, {status: 500});
  }
}

