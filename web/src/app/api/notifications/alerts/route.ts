import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';

function firstDayOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function fmtDateISO(date: Date) { return date.toISOString().slice(0, 10); }

/**
 * GET /api/notifications/alerts
 * Returns simple in-app alerts for the current user.
 * - Employee: pending/draft status for current month's timesheet
 * - Manager/Admin: counts of team pending/draft
 */
export async function GET() {
  try {
    const user = await requireApiAuth();
    const supabase = getServiceSupabase();

    const now = new Date();
    const periodStartISO = fmtDateISO(firstDayOfMonth(now));

    const alerts: Array<{ type: 'info' | 'warning'; message?: string; i18nKey?: string; params?: Record<string, any>; actionKey?: string; href?: string }> = [];

    if (user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') {
      // Derive team overview
      // Find groups for managers; admins see all employees in tenant
      let employeeIds: string[] = [];
      if (user.role === 'ADMIN') {
        const { data: emps } = await supabase
          .from('employees')
          .select('id')
          .eq('tenant_id', user.tenant_id as string);
        employeeIds = [...new Set((emps ?? []).map((e: any) => e.id))];
      } else {
        const { data: mgrGroups } = await supabase
          .from('manager_group_assignments')
          .select('group_id')
          .eq('manager_id', user.id);
        const groupIds = [...new Set((mgrGroups ?? []).map((g: any) => g.group_id))];
        if (groupIds.length) {
          const { data: memberships } = await supabase
            .from('employee_group_members')
            .select('employee_id')
            .in('group_id', groupIds);
          employeeIds = [...new Set((memberships ?? []).map((m: any) => m.employee_id))];
        }
      }

      if (employeeIds.length) {
        const { data: tsRows } = await supabase
          .from('timesheets')
          .select('id, employee_id, status')
          .eq('periodo_ini', periodStartISO)
          .in('employee_id', employeeIds);
        const present = new Map(tsRows?.map((t: any) => [t.employee_id, t.status]) ?? []);
        const missing = employeeIds.filter((id) => !present.has(id));
        const drafts = (tsRows ?? []).filter((t: any) => t.status === 'rascunho');
        const pendingCount = missing.length; // not started
        const draftCount = drafts.length;    // in progress not submitted
        if (pendingCount || draftCount) {
          alerts.push({
            type: 'warning',
            i18nKey: 'manager.teamSummary',
            params: { pending: pendingCount, draft: draftCount },
            actionKey: 'open',
            href: '/manager/pending'
          });
        }
      }
    }

    // Employee (self)
    if (user.role === 'USER' || user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') {
      // Try to find employee record for current tenant
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', user.id)
        .eq('tenant_id', user.tenant_id as string)
        .limit(1)
        .maybeSingle();
      if (emp?.id) {
        const { data: ts } = await supabase
          .from('timesheets')
          .select('id, status')
          .eq('periodo_ini', periodStartISO)
          .eq('employee_id', emp.id)
          .limit(1)
          .maybeSingle();
        if (!ts) {
          alerts.push({
            type: 'warning',
            i18nKey: 'employee.notStarted',
            params: { month: periodStartISO.slice(0, 7) },
            actionKey: 'fillNow',
            href: '/employee/timesheets'
          });
        } else if (ts.status === 'rascunho') {
          alerts.push({
            type: 'info',
            i18nKey: 'employee.draft',
            params: { month: periodStartISO.slice(0, 7) },
            actionKey: 'review',
            href: `/employee/timesheets/${ts.id}`
          });
        }
      }
    }

    return NextResponse.json({ alerts }, { status: 200 });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

