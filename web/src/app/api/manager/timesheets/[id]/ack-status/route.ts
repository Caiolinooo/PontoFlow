import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireApiRole } from '@/lib/auth/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiRole(['ADMIN','MANAGER','MANAGER_TIMESHEET']);
    const { id } = await ctx.params;

    // Ensure timesheet is accessible (reuse minimal check)
    const { data: ts } = await supabase
      .from('timesheets')
      .select('id, tenant_id, employee_id')
      .eq('id', id)
      .single();
    if (!ts) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (user.role !== 'ADMIN') {
      // Check manager-group access
      const { data: rel } = await supabase
        .from('employee_group_members')
        .select('group_id')
        .eq('tenant_id', ts.tenant_id)
        .eq('employee_id', ts.employee_id);
      const groupIds = (rel || []).map(r => r.group_id);
      if (!groupIds.length) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      const { data: mg } = await supabase
        .from('manager_group_assignments')
        .select('group_id')
        .eq('tenant_id', ts.tenant_id)
        .eq('manager_user_id', user.id)
        .in('group_id', groupIds)
        .limit(1);
      if (!mg || mg.length === 0) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // Get entries of this timesheet
    const { data: entries } = await supabase
      .from('timesheet_entries')
      .select('id')
      .eq('timesheet_id', id);
    const entryIds = (entries ?? []).map(e => e.id);
    if (entryIds.length === 0) return NextResponse.json({ total: 0, withJustification: 0, pendingAck: 0, contested: 0, acknowledged: 0 });

    // Audits for manager edits
    const { data: edits } = await supabase
      .from('audit_log')
      .select('id, new_values')
      .eq('tenant_id', ts.tenant_id)
      .eq('action', 'manager_edit_closed_period')
      .eq('resource_type', 'timesheet_entry')
      .in('resource_id', entryIds);

    const editIds = (edits ?? []).map(a => a.id);
    const withJustification = (edits ?? []).length;

    if (editIds.length === 0) return NextResponse.json({ total: entryIds.length, withJustification, pendingAck: 0, contested: 0, acknowledged: 0 });

    // Acknowledgements
    const { data: acks } = await supabase
      .from('audit_log')
      .select('id, resource_id, new_values')
      .eq('tenant_id', ts.tenant_id)
      .eq('action', 'employee_acknowledge_adjustment')
      .eq('resource_type', 'audit_log')
      .in('resource_id', editIds);

    const ackByEdit = new Map<string, { accepted?: boolean }>();
    for (const a of acks ?? []) {
      const nv = (a.new_values || {}) as any;
      ackByEdit.set(a.resource_id as string, { accepted: nv.accepted !== false });
    }

    let acknowledged = 0;
    let contested = 0;
    for (const eid of editIds) {
      const st = ackByEdit.get(eid);
      if (st) {
        acknowledged++;
        if (st.accepted === false) contested++;
      }
    }
    const pendingAck = withJustification - acknowledged;

    return NextResponse.json({ total: entryIds.length, withJustification, pendingAck, contested, acknowledged });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

