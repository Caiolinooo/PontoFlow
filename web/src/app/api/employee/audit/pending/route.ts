import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireApiAuth } from '@/lib/auth/server';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, anon);
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireApiAuth();
    const supabase = getSupabase();

    // Employee for this user
    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select('id, tenant_id, display_name')
      .eq('profile_id', user.id)
      .limit(1)
      .maybeSingle();

    if (empError) {
      console.error('Error fetching employee:', empError);
      return NextResponse.json({ error: 'database_error' }, { status: 500 });
    }

    if (!emp) return NextResponse.json({ items: [], count: 0 });

    // All timesheets of this employee (open range OK)
    const { data: ts } = await supabase
      .from('timesheets')
      .select('id')
      .eq('employee_id', emp.id);
    const tsIds = (ts ?? []).map(t => t.id);
    if (!tsIds.length) return NextResponse.json({ items: [], count: 0 });

    // All entries of those timesheets
    const { data: entries } = await supabase
      .from('timesheet_entries')
      .select('id, timesheet_id, data')
      .in('timesheet_id', tsIds);
    const entryIds = (entries ?? []).map(e => e.id);
    if (!entryIds.length) return NextResponse.json({ items: [], count: 0 });

    // Manager edits for those entries
    const { data: edits } = await supabase
      .from('audit_log')
      .select('id, user_id, created_at, new_values')
      .eq('tenant_id', emp.tenant_id)
      .eq('action', 'manager_edit_closed_period')
      .eq('resource_type', 'timesheet_entry')
      .in('resource_id', entryIds)
      .order('created_at', { ascending: false });

    const editIds = (edits ?? []).map(a => a.id);
    if (!editIds.length) return NextResponse.json({ items: [], count: 0 });

    // Acks for those edits
    const { data: acks } = await supabase
      .from('audit_log')
      .select('id, resource_id, new_values')
      .eq('tenant_id', emp.tenant_id)
      .eq('action', 'employee_acknowledge_adjustment')
      .eq('resource_type', 'audit_log')
      .in('resource_id', editIds);
    const ackSet = new Set((acks ?? []).map(a => a.resource_id as string));

    const pending = (edits ?? []).filter(e => !ackSet.has(e.id));
    if (!pending.length) return NextResponse.json({ items: [], count: 0 });

    // Fetch manager names
    const mgrIds = [...new Set(pending.map(p => p.user_id as string))];
    const { data: profs } = await supabase
      .from('profiles')
      .select('user_id, display_name, email')
      .in('user_id', mgrIds);
    const nameByUser: Record<string, string> = {};
    for (const p of profs ?? []) nameByUser[p.user_id as string] = p.display_name ?? '';

    const items = pending.map(p => ({
      auditId: p.id,
      createdAt: p.created_at,
      justification: (p.new_values as any)?.justification || '',
      managerName: nameByUser[p.user_id as string] || 'Gestor',
      declarationUrl: `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/admin/declarations/manager-edit/${p.id}?format=pdf`
    }));

    return NextResponse.json({ items, count: items.length });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

