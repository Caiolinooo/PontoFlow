import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase();

  // Simple unified audit: approvals + entries changes timestamps
  const { data: approvals } = await supabase
    .from('approvals')
    .select('id, timesheet_id, manager_id, status, mensagem, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const { data: entries } = await supabase
    .from('timesheet_entries')
    .select('id, timesheet_id, tipo, data, hora_ini, hora_fim, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return NextResponse.json({ approvals: approvals ?? [], entries: entries ?? [] });
}

