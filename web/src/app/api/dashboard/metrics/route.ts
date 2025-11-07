import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { calculateOvertimeMetrics } from '@/lib/time-display';

// Use BRT timezone (America/Sao_Paulo) for date calculations
function firstDayOfMonth(d: Date) {
  // Create date in BRT timezone
  const brtDate = new Date(d.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  return new Date(brtDate.getFullYear(), brtDate.getMonth(), 1);
}

function fmtDateISO(date: Date) {
  // Convert to BRT timezone first, then format
  const brtDate = new Date(date.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  return brtDate.toISOString().slice(0, 10);
}

/**
 * GET /api/dashboard/metrics
 * Returns dashboard metrics for the current user
 * 
 * For Employees:
 * - hoursThisMonth: Total hours worked this month
 * - overtime50: Hours with 50% overtime rate
 * - overtime100: Hours with 100% overtime rate
 * 
 * For Managers/Admins:
 * - hoursThisMonth: Total hours worked by their team this month
 * - approved: Number of approved timesheets
 * - pending: Number of pending timesheets
 */
export async function GET() {
  try {
    const user = await requireApiAuth();
    const supabase = getServiceSupabase();

    // Get current month in BRT timezone (outubro 2025)
    const nowBRT = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const periodStart = firstDayOfMonth(nowBRT);
    const periodStartISO = fmtDateISO(periodStart);

    // If user is employee, get their employee record
    let employeeId = null;
    if (user.role === 'USER' || user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', user.id)
        .eq('tenant_id', user.tenant_id as string)
        .limit(1)
        .maybeSingle();
      employeeId = emp?.id;
    }

    // Get timesheet IDs for the current month
    let timesheetIds: string[] = [];
    let totalHours = 0;
    let overtime50Hours = 0;
    let overtime100Hours = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let draftCount = 0; // For manager dashboard consistency

    if (user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') {
      // For managers/admins, get team metrics
      
      // Resolve employee IDs under visibility
      let employeeIds: string[] = [];
      
      if (user.role === 'ADMIN') {
        // All employees of tenant
        const { data: emps } = await supabase
          .from('employees')
          .select('id')
          .eq('tenant_id', user.tenant_id as string);
        employeeIds = [...new Set((emps ?? []).map((e: any) => e.id))];
      } else {
        // Employees of manager's delegated groups
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
        // Get team timesheets for the month with employee names
        const { data: tsRows } = await supabase
          .from('timesheets')
          .select('id, status, employee_id, employees!inner(name)')
          .eq('periodo_ini', periodStartISO)
          .in('employee_id', employeeIds);

        const teamTimesheetIds = (tsRows ?? []).map((t: any) => t.id);
        timesheetIds = teamTimesheetIds;

        // Count approved and pending timesheets
        // Note: Database uses Portuguese status values (rascunho, enviado, aprovado, recusado)
        const present = new Map(tsRows?.map((t: any) => [t.employee_id, t.status]) ?? []);
        const missing = employeeIds.filter((id) => !present.has(id));
        const drafts = (tsRows ?? []).filter((t: any) => t.status === 'rascunho'); // Portuguese enum value
        const submitted = (tsRows ?? []).filter((t: any) => t.status === 'enviado'); // Portuguese enum value
        const approved = (tsRows ?? []).filter((t: any) => t.status === 'aprovado'); // Portuguese enum value

        approvedCount = approved.length;
        // Count missing (no timesheet) and drafts separately to match manager panel logic
        const missingCount = missing.length;
        draftCount = drafts.length;
        pendingCount = submitted.length; // Dashboard shows submitted timesheets waiting for approval

        // Get names of employees with pending timesheets
        const pendingEmployeeNames = submitted.map((t: any) => t.employees?.name || 'Desconhecido');

        // Get total hours for all team timesheets
        if (teamTimesheetIds.length) {
          const { data: entries } = await supabase
            .from('timesheet_entries')
            .select('horas')
            .in('timesheet_id', teamTimesheetIds);

          totalHours = (entries ?? []).reduce((sum: number, entry: any) => sum + (entry.horas || 0), 0);
        }

        // Return metrics with pending employee names for managers/admins
        return NextResponse.json({
          metrics: {
            hoursThisMonth: totalHours,
            overtime50: overtime50Hours,
            overtime100: overtime100Hours,
            approved: approvedCount,
            pending: pendingCount,
            pendingEmployees: pendingEmployeeNames, // List of employee names with pending timesheets
            drafts: draftCount,
            submitted: 0,
            rejected: 0
          }
        }, { status: 200 });
      }
    } else if (employeeId) {
      // For employees, get their personal metrics
      const { data: tsRow } = await supabase
        .from('timesheets')
        .select('id, status')
        .eq('periodo_ini', periodStartISO)
        .eq('employee_id', employeeId)
        .limit(1)
        .maybeSingle();

      if (tsRow) {
        timesheetIds = [tsRow.id];
        
        // Get all entries for this timesheet
        const { data: entries } = await supabase
          .from('timesheet_entries')
          .select('horas')
          .eq('timesheet_id', tsRow.id);

        // Calculate hours by type
        const allEntries = entries ?? [];
        totalHours = allEntries.reduce((sum: number, entry: any) => sum + (entry.horas || 0), 0);
        
        // Note: We would need to distinguish between regular and overtime hours
        // For now, we'll use a simple calculation. In a real system,
        // you'd have tipo column to distinguish regular vs overtime
        // FIXED: Use proper calculation that allows negative values
        const overtime = calculateOvertimeMetrics(totalHours);
        overtime50Hours = overtime.overtime50;
        overtime100Hours = overtime.overtime100;
      }
    }

    return NextResponse.json({
      metrics: {
        hoursThisMonth: totalHours,
        overtime50: overtime50Hours,
        overtime100: overtime100Hours,
        approved: approvedCount,
        pending: pendingCount,
        // Additional detailed metrics to match manager panel
        drafts: user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET' ? draftCount : 0,
        submitted: 0, // Would need additional logic to count 'enviado' status
        rejected: 0   // Would need additional logic to count 'recusado' status
      }
    }, { status: 200 });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('Dashboard metrics error:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
