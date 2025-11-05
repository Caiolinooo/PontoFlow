import {NextRequest, NextResponse} from 'next/server';
import {requireApiAuth} from '@/lib/auth/server';
import {getServiceSupabase} from '@/lib/supabase/server';

export async function GET(_req: NextRequest, context: {params: Promise<{id: string}>}) {
  try {
    const user = await requireApiAuth();
    const {id} = await context.params;

    // Use service client to bypass RLS (we handle authorization manually)
    const supabase = getServiceSupabase();

    const {data: ts, error} = await supabase
      .from('timesheets')
      .select('id,status,periodo_ini,periodo_fim,employee_id,tenant_id')
      .eq('id', id)
      .single();
    if (error || !ts) return NextResponse.json({error: error?.message ?? 'not_found'}, {status: 404});

    // Ownership: current user must be the employee owner of this timesheet
    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('tenant_id', ts.tenant_id)
      .eq('profile_id', user.id)
      .limit(1)
      .maybeSingle();

    if (empError) {
      console.error('Error fetching employee:', empError);
      return NextResponse.json({ error: 'database_error' }, { status: 500 });
    }

    if (user.role !== 'ADMIN' && (!emp || ts.employee_id !== emp.id)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    console.log(`🔍 [GET /api/employee/timesheets/${id}] Fetching entries...`);

    const [entriesRes, annotationsRes] = await Promise.all([
      supabase.from('timesheet_entries').select('*').eq('timesheet_id', id).order('data', {ascending: true}).order('hora_ini', {ascending: true, nullsFirst: false}),
      supabase.from('timesheet_annotations').select('id, entry_id, field_path, message, created_at').eq('timesheet_id', id).order('created_at', {ascending: true})
    ]);

    if (entriesRes.error) {
      console.error('❌ [Database] Error fetching entries:', entriesRes.error);
    } else {
      console.log(`✅ [Database] Found ${entriesRes.data?.length || 0} entries`);
      // Log entries grouped by date
      const entriesByDate = (entriesRes.data || []).reduce((acc: Record<string, number>, entry: any) => {
        acc[entry.data] = (acc[entry.data] || 0) + 1;
        return acc;
      }, {});
      console.log('📊 [Database] Entries by date:', entriesByDate);
    }

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

