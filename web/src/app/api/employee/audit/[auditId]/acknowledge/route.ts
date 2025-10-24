import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireApiAuth } from '@/lib/auth/server';
import { z } from 'zod';
import { logAudit } from '@/lib/audit/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const Body = z.object({
  accepted: z.boolean().optional().default(true),
  note: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ auditId: string }> }) {
  try {
    const user = await requireApiAuth();
    const { auditId } = await ctx.params;

    const { data: audit } = await supabase
      .from('audit_log')
      .select('id, tenant_id, action, resource_type, resource_id, new_values')
      .eq('id', auditId)
      .single();
    if (!audit) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (audit.action !== 'manager_edit_closed_period' || audit.resource_type !== 'timesheet_entry') {
      return NextResponse.json({ error: 'invalid_audit' }, { status: 400 });
    }

    // Resolve timesheet and employee owner
    const { data: entry } = await supabase
      .from('timesheet_entries')
      .select('id, timesheet_id, tenant_id')
      .eq('id', audit.resource_id)
      .maybeSingle();
    if (!entry) return NextResponse.json({ error: 'entry_not_found' }, { status: 404 });

    const { data: ts } = await supabase
      .from('timesheets')
      .select('id, employee_id, tenant_id')
      .eq('id', entry.timesheet_id)
      .single();
    if (!ts) return NextResponse.json({ error: 'timesheet_not_found' }, { status: 404 });

    // Ownership: ADMIN bypass, otherwise must be the employee owner
    if (user.role !== 'ADMIN') {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('tenant_id', ts.tenant_id)
        .eq('profile_id', user.id)
        .maybeSingle();
      if (!emp || emp.id !== ts.employee_id) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });

    await logAudit({
      tenantId: ts.tenant_id,
      userId: user.id,
      action: 'employee_acknowledge_adjustment',
      resourceType: 'audit_log',
      resourceId: auditId,
      oldValues: null,
      newValues: { accepted: parsed.data.accepted, note: parsed.data.note ?? null },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

