import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase();

  // Fetch approvals with related data
  const { data: approvals } = await supabase
    .from('approvals')
    .select(`
      id,
      timesheet_id,
      manager_id,
      status,
      mensagem,
      created_at,
      timesheets!inner(
        id,
        employee_id,
        employees!inner(display_name)
      ),
      profiles!approvals_manager_id_fkey(display_name)
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  // Fetch entries with related data
  const { data: entries } = await supabase
    .from('timesheet_entries')
    .select(`
      id,
      timesheet_id,
      tipo,
      data,
      hora_ini,
      hora_fim,
      created_at,
      timesheets!inner(
        id,
        employee_id,
        employees!inner(display_name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  // Transform the data to include readable names
  const transformedApprovals = (approvals ?? []).map((a: any) => ({
    ...a,
    employee_name: a.timesheets?.employees?.display_name || 'N/A',
    manager_name: a.profiles?.display_name || 'N/A'
  }));

  const transformedEntries = (entries ?? []).map((e: any) => ({
    ...e,
    employee_name: e.timesheets?.employees?.display_name || 'N/A'
  }));

  return NextResponse.json({
    approvals: transformedApprovals,
    entries: transformedEntries
  });
}

