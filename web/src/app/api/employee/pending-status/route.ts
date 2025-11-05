import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import {
  getCurrentTimeInTenantTimezone,
  formatDateInTimezone,
  calculateTimesheetDeadline,
  getDaysUntilDeadline,
  formatTimesheetPeriodDisplay,
  getTimezoneAbbreviation,
  isPastDeadline,
  TimezoneType
} from '@/lib/timezone/utils';

// Use tenant timezone for date calculations
function firstDayOfMonthInTimezone(d: Date, timezone: TimezoneType) {
  const tzDate = new Date(d.toLocaleString("en-US", { timeZone: timezone }));
  return new Date(tzDate.getFullYear(), tzDate.getMonth(), 1);
}

function fmtDateISOInTimezone(date: Date, timezone: TimezoneType) {
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  return tzDate.toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function getMonthName(date: Date, locale: string = 'pt-BR') {
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

function daysUntilDeadlineInTimezone(periodEnd: Date, timezone: TimezoneType): {
  daysLeft: number;
  isOverdue: boolean;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical'
} {
  const nowInTz = getCurrentTimeInTenantTimezone(timezone);
  const timeDiff = periodEnd.getTime() - nowInTz.getTime();
  const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  let isOverdue = false;
  let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  
  if (daysLeft < 0) {
    isOverdue = true;
    urgencyLevel = 'critical';
  } else if (daysLeft <= 1) {
    urgencyLevel = 'critical';
  } else if (daysLeft <= 3) {
    urgencyLevel = 'high';
  } else if (daysLeft <= 7) {
    urgencyLevel = 'medium';
  }
  
  return { daysLeft, isOverdue, urgencyLevel };
}

/**
 * GET /api/employee/pending-status
 * Returns comprehensive pending status for the authenticated employee.
 * Includes current month status, past month pendencies, and deadline information.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireApiRole(['USER', 'ADMIN', 'MANAGER', 'MANAGER_TIMESHEET']);
    const supabase = getServiceSupabase();

    // Get user's tenant, timezone, and creation date
    const { data: employee } = await supabase
      .from('employees')
      .select('tenant_id, created_at')
      .eq('profile_id', user.id)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get employee creation date to avoid showing false overdue warnings
    const employeeCreatedAt = new Date(employee.created_at);
    console.log(`[PENDING-STATUS] Employee created at: ${employeeCreatedAt.toISOString()}`);
    
    const { data: tenant } = await supabase
      .from('tenants')
      .select('timezone')
      .eq('id', employee.tenant_id)
      .single();
    
    const tenantTimezone: TimezoneType = tenant?.timezone || 'America/Sao_Paulo';
    console.log(`[PENDING-STATUS] User timezone: ${tenantTimezone}`);
    
    // Use tenant timezone for current date calculation
    const nowInTz = getCurrentTimeInTenantTimezone(tenantTimezone);
    const currentMonthStart = firstDayOfMonthInTimezone(nowInTz, tenantTimezone);
    const currentMonthStartISO = fmtDateISOInTimezone(currentMonthStart, tenantTimezone);
    
    // Check if current month timesheet exists and get its status
    const { data: currentTimesheet } = await supabase
      .from('timesheets')
      .select('id, status, periodo_ini, periodo_fim')
      .eq('employee_id', user.id)
      .eq('periodo_ini', currentMonthStartISO)
      .single();
    
    // Get current month deadline using tenant timezone
    const defaultDeadline = calculateTimesheetDeadline(currentMonthStart, tenantTimezone, 5);
    
    // Adjust deadline to last business day if it falls on weekend
    while (defaultDeadline.getDay() === 0 || defaultDeadline.getDay() === 6) {
      defaultDeadline.setDate(defaultDeadline.getDate() - 1);
    }
    
    const deadlineInfo = daysUntilDeadlineInTimezone(defaultDeadline, tenantTimezone);
    
    // Current month status
    let currentMonthStatus = {
      hasTimesheet: false,
      status: 'pendente' as 'pendente' | 'rascunho' | 'enviado' | 'aprovado' | 'recusado',
      entriesCount: 0,
      completionPercentage: 0,
      deadline: defaultDeadline.toISOString(),
      deadlineInfo,
      message: ''
    };
    
    if (currentTimesheet) {
      currentMonthStatus.hasTimesheet = true;
      currentMonthStatus.status = currentTimesheet.status as any;
      
      // Get entries count for the current month timesheet
      const { data: entries } = await supabase
        .from('timesheet_entries')
        .select('id')
        .eq('timesheet_id', currentTimesheet.id);
      
      currentMonthStatus.entriesCount = entries?.length || 0;
      
      // Calculate completion percentage (based on work days in month)
      const workDaysInMonth = new Date(nowInTz.getFullYear(), nowInTz.getMonth() + 1, 0).getDate();
      currentMonthStatus.completionPercentage = Math.min(100, Math.round((currentMonthStatus.entriesCount / workDaysInMonth) * 100));
      
      // Generate message based on status
      switch (currentTimesheet.status) {
        case 'rascunho':
          if (currentMonthStatus.completionPercentage === 0) {
            currentMonthStatus.message = 'Comece a preencher seu timesheet deste mês';
          } else if (currentMonthStatus.completionPercentage < 50) {
            currentMonthStatus.message = `Timesheet ${currentMonthStatus.completionPercentage}% completo - continue preenchendo`;
          } else {
            currentMonthStatus.message = `Timesheet ${currentMonthStatus.completionPercentage}% completo - finalize em breve`;
          }
          break;
        case 'enviado':
          currentMonthStatus.message = 'Timesheet enviado para aprovação';
          break;
        case 'aprovado':
          currentMonthStatus.message = 'Timesheet aprovado ✅';
          break;
        case 'recusado':
          currentMonthStatus.message = 'Timesheet devolvido para correção';
          break;
        default:
          currentMonthStatus.message = 'Timesheet pendente de criação';
      }
    } else {
      // No timesheet created yet
      currentMonthStatus.message = deadlineInfo.isOverdue
        ? 'Timesheet vencido - preencha com urgência!'
        : deadlineInfo.daysLeft <= 3
        ? `Timesheet pendente - apenas ${deadlineInfo.daysLeft} dias restantes!`
        : `Timesheet pendente - ${deadlineInfo.daysLeft} dias restantes`;
    }
    
    // Get past month pendencies (last 6 months) using tenant timezone
    // IMPORTANT: Only check months AFTER the employee was created to avoid false overdue warnings
    const pastMonths: Array<{
      month: string;
      status: 'pendente' | 'rascunho' | 'enviado' | 'aprovado' | 'recusado';
      hasTimesheet: boolean;
      deadline: string;
      isOverdue: boolean;
    }> = [];

    // Calculate the first month the employee should have a timesheet
    const employeeCreatedMonth = firstDayOfMonthInTimezone(employeeCreatedAt, tenantTimezone);

    for (let i = 1; i <= 6; i++) {
      const monthStart = addMonths(currentMonthStart, -i);
      const monthStartISO = fmtDateISOInTimezone(monthStart, tenantTimezone);

      // Skip months before employee was created
      if (monthStart < employeeCreatedMonth) {
        console.log(`[PENDING-STATUS] Skipping ${getMonthName(monthStart)} - before employee creation date`);
        continue;
      }

      const { data: pastTimesheet } = await supabase
        .from('timesheets')
        .select('status')
        .eq('employee_id', user.id)
        .eq('periodo_ini', monthStartISO)
        .single();

      // Calculate deadline for each month using tenant timezone
      const monthDeadline = calculateTimesheetDeadline(monthStart, tenantTimezone, 5);

      // Adjust deadline to last business day if it falls on weekend
      while (monthDeadline.getDay() === 0 || monthDeadline.getDay() === 6) {
        monthDeadline.setDate(monthDeadline.getDate() - 1);
      }

      const isOverdue = isPastDeadline(monthStart, tenantTimezone, 5);

      pastMonths.push({
        month: getMonthName(monthStart),
        status: pastTimesheet?.status || 'pendente',
        hasTimesheet: !!pastTimesheet,
        deadline: monthDeadline.toISOString(),
        isOverdue
      });
    }
    
    // Filter only pending ones for the main list
    const pendingMonths = pastMonths.filter(m => !m.hasTimesheet || m.status === 'pendente' || m.status === 'rascunho');
    
    // Calculate overall urgency
    let overallUrgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let urgentActionRequired = false;
    
    if (deadlineInfo.urgencyLevel === 'critical') {
      overallUrgency = 'critical';
      urgentActionRequired = true;
    } else if (currentMonthStatus.status === 'pendente' && deadlineInfo.urgencyLevel === 'high') {
      overallUrgency = 'high';
    } else if (pendingMonths.length > 2) {
      overallUrgency = 'medium';
    }
    
    const response = {
      currentMonth: currentMonthStatus,
      pendingMonths,
      summary: {
        totalPending: pendingMonths.length,
        overdueCount: pendingMonths.filter(m => m.isOverdue).length,
        urgentActionRequired,
        overallUrgency,
        nextDeadline: defaultDeadline.toISOString(),
        daysUntilNextDeadline: deadlineInfo.daysLeft,
        timezone: tenantTimezone,
        timezoneAbbreviation: getTimezoneAbbreviation(tenantTimezone)
      }
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      const status = e.message === 'Unauthorized' ? 401 : 403;
      return NextResponse.json({ error: e.message.toLowerCase() }, { status });
    }
    console.error('Error in employee pending status:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}