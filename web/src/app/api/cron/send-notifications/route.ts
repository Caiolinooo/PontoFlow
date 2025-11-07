import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { dispatchNotification } from '@/lib/notifications/dispatcher';

/**
 * Cron job to send automated notifications for pending timesheets
 * 
 * This endpoint should be called daily by a cron service (e.g., Vercel Cron, GitHub Actions)
 * 
 * Authorization: Requires CRON_SECRET in headers or query params
 * 
 * Logic:
 * 1. Get all pending timesheets (status = 'rascunho' or 'enviado')
 * 2. For employees with pending timesheets: send deadline reminder
 * 3. For managers with team pending timesheets: send manager pending reminder
 * 4. Log all notifications sent
 */

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
    }

    const providedSecret = authHeader?.replace('Bearer ', '') || req.nextUrl.searchParams.get('secret');
    
    if (providedSecret !== cronSecret) {
      console.error('Invalid cron secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceSupabase();
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    console.log(`[${new Date().toISOString()}] Starting notification cron job for ${currentYear}-${currentMonth + 1}-${currentDay}`);

    // Get all tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name');

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError);
      return NextResponse.json({ error: tenantsError.message }, { status: 500 });
    }

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ message: 'No tenants found', sent: 0 });
    }

    const results = [];
    let totalSent = 0;

    for (const tenant of tenants) {
      try {
        console.log(`Processing tenant: ${tenant.name}`);
        
        // Get tenant settings for notification configuration
        const { data: settings } = await supabase
          .from('tenant_settings')
          .select('deadline_day, reminder_days_before')
          .eq('tenant_id', tenant.id)
          .limit(1)
          .maybeSingle();

        const deadlineDay = settings?.deadline_day ?? 0;
        const reminderDaysBefore = settings?.reminder_days_before ?? 3;

        // Calculate current period and deadline
        const currentPeriodStart = new Date(currentYear, currentMonth, 1);
        const currentPeriodEnd = new Date(currentYear, currentMonth + 1, 0);
        
        const deadlineDate = deadlineDay === 0 
          ? new Date(currentYear, currentMonth + 1, 0) // Last day of month
          : new Date(currentYear, currentMonth, deadlineDay);

        // Days until deadline
        const timeDiff = deadlineDate.getTime() - today.getTime();
        const daysUntilDeadline = Math.ceil(timeDiff / (1000 * 3600 * 24));

        console.log(`Tenant ${tenant.name}: Deadline ${deadlineDate.toDateString()}, Days until: ${daysUntilDeadline}`);

        let tenantResult = {
          tenant: tenant.name,
          employeeReminders: 0,
          managerReminders: 0,
          errors: 0
        };

        // 1. Send deadline reminders to employees with pending timesheets
        const employeeReminders = await sendEmployeeReminders(supabase, tenant.id, {
          daysUntilDeadline,
          currentPeriodStart: currentPeriodStart.toISOString().split('T')[0],
          currentPeriodEnd: currentPeriodEnd.toISOString().split('T')[0]
        });

        tenantResult.employeeReminders = employeeReminders;
        totalSent += employeeReminders;

        // 2. Send pending reminders to managers if it's past the reminder period
        if (daysUntilDeadline <= reminderDaysBefore) {
          const managerReminders = await sendManagerReminders(supabase, tenant.id, {
            currentPeriodStart: currentPeriodStart.toISOString().split('T')[0],
            currentPeriodEnd: currentPeriodEnd.toISOString().split('T')[0]
          });
          
          tenantResult.managerReminders = managerReminders;
          totalSent += managerReminders;
        }

        results.push(tenantResult);
        console.log(`Tenant ${tenant.name} completed:`, tenantResult);

      } catch (error: any) {
        console.error(`Error processing tenant ${tenant.name}:`, error);
        results.push({
          tenant: tenant.name,
          error: error.message,
          employeeReminders: 0,
          managerReminders: 0,
          errors: 1
        });
      }
    }

    const successCount = results.filter(r => !(r as any).error).length;
    const errorCount = results.filter(r => (r as any).error).length;

    return NextResponse.json({
      message: 'Notification cron job completed',
      timestamp: new Date().toISOString(),
      sent: totalSent,
      successCount,
      errorCount,
      results
    });

  } catch (error: any) {
    console.error('Notification cron job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

/**
 * Send deadline reminder emails to employees with pending timesheets
 */
async function sendEmployeeReminders(
  supabase: any, 
  tenantId: string, 
  params: { daysUntilDeadline: number; currentPeriodStart: string; currentPeriodEnd: string }
) {
  let sentCount = 0;

  try {
    // Get employees with pending timesheets for current period
    const { data: pendingTimesheets, error } = await supabase
      .from('timesheets')
      .select(`
        id,
        periodo_ini,
        periodo_fim,
        status,
        employees!inner (
          id,
          profile_id,
          profiles!inner (
            user_id,
            display_name,
            email
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('periodo_ini', params.currentPeriodStart)
      .in('status', ['rascunho', 'enviado']); // Portuguese enum values

    if (error) {
      console.error('Error fetching pending timesheets:', error);
      return 0;
    }

    if (!pendingTimesheets || pendingTimesheets.length === 0) {
      console.log('No pending timesheets found');
      return 0;
    }

    console.log(`Found ${pendingTimesheets.length} pending timesheets`);

    for (const timesheet of pendingTimesheets) {
      try {
        const employee = timesheet.employees;
        const profile = employee.profiles;
        const periodLabel = `${new Date(timesheet.periodo_ini).toLocaleDateString('pt-BR')} - ${new Date(timesheet.periodo_fim).toLocaleDateString('pt-BR')}`;
        
        // Check if user wants email notifications
        const { data: preferences } = await supabase
          .from('notification_preferences')
          .select('email_notifications, deadline_reminders')
          .eq('user_id', profile.user_id)
          .maybeSingle();

        // Skip if user disabled notifications
        if (preferences && preferences.email_notifications === false || preferences.deadline_reminders === false) {
          console.log(`Skipping notifications for user ${profile.display_name} - disabled in preferences`);
          continue;
        }

        // Send deadline reminder
        await dispatchNotification({
          type: 'deadline_reminder',
          to: profile.email,
          payload: {
            name: profile.display_name,
            periodLabel,
            daysLeft: params.daysUntilDeadline,
            url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://pontoflow.app'}/pt-BR/employee/timesheets`,
            locale: 'pt-BR' as const
          }
        });

        // Log the notification
        await supabase.from('notification_log').insert({
          user_id: profile.user_id,
          type: 'email',
          title: 'Deadline Reminder',
          body: `Your timesheet for period ${periodLabel} is pending. ${params.daysUntilDeadline} days left.`,
          data: { 
            timesheet_id: timesheet.id,
            period: periodLabel,
            days_left: params.daysUntilDeadline,
            notification_type: 'deadline_reminder'
          }
        });

        sentCount++;
        console.log(`Sent deadline reminder to ${profile.display_name} (${profile.email})`);

      } catch (error) {
        console.error('Error sending employee reminder:', error);
      }
    }

  } catch (error) {
    console.error('Error in sendEmployeeReminders:', error);
  }

  return sentCount;
}

/**
 * Send pending reminder emails to managers
 */
async function sendManagerReminders(
  supabase: any, 
  tenantId: string, 
  params: { currentPeriodStart: string; currentPeriodEnd: string }
) {
  let sentCount = 0;

  try {
    // Get managers with team pending timesheets
    const { data: managers, error } = await supabase
      .from('manager_group_assignments')
      .select(`
        manager_id,
        groups!inner (
          id,
          name,
          employee_group_members!inner (
            employees!inner (
              id,
              profile_id,
              profiles!inner (
                user_id,
                display_name,
                email
              )
            )
          )
        )
      `)
      .eq('groups.tenant_id', tenantId);

    if (error) {
      console.error('Error fetching managers:', error);
      return 0;
    }

    if (!managers || managers.length === 0) {
      console.log('No managers found');
      return 0;
    }

    // Process each manager
    const managerMap = new Map();
    
    for (const assignment of managers) {
      const managerId = assignment.manager_id;
      
      if (!managerMap.has(managerId)) {
        managerMap.set(managerId, {
          managerId,
          employees: []
        });
      }
      
      // Get pending timesheets for this manager's employees
      const { data: pendingTimesheets, error: timesheetError } = await supabase
        .from('timesheets')
        .select(`
          id,
          employees!inner (
            id,
            profile_id,
            profiles!inner (
              user_id,
              display_name
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('periodo_ini', params.currentPeriodStart)
        .in('status', ['rascunho', 'enviado'])
        .in('employee_id', assignment.groups.employee_group_members.map((em: any) => em.employees.id));

      if (timesheetError) {
        console.error('Error fetching manager pending timesheets:', timesheetError);
        continue;
      }

      if (pendingTimesheets && pendingTimesheets.length > 0) {
        const manager = managerMap.get(managerId);
        const employeeNames = pendingTimesheets.map((ts: any) => ts.employees.profiles.display_name);
        manager.employees.push(...employeeNames);
      }
    }

    // Remove duplicates and send notifications
    for (const [managerId, data] of managerMap) {
      const uniqueEmployees = [...new Set(data.employees)] as string[];
      
      if (uniqueEmployees.length === 0) {
        continue;
      }

      try {
        // Get manager profile
        const { data: managerProfile } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .eq('user_id', managerId)
          .single();

        if (!managerProfile) {
          continue;
        }

        // Check if manager wants notifications
        const { data: preferences } = await supabase
          .from('notification_preferences')
          .select('email_notifications, approval_notifications')
          .eq('user_id', managerId)
          .maybeSingle();

        // Skip if manager disabled notifications
        if (preferences && preferences.email_notifications === false || preferences.approval_notifications === false) {
          console.log(`Skipping notifications for manager ${managerProfile.display_name} - disabled in preferences`);
          continue;
        }

        const periodLabel = `${new Date(params.currentPeriodStart).toLocaleDateString('pt-BR')} - ${new Date(params.currentPeriodEnd).toLocaleDateString('pt-BR')}`;

        // Send manager pending reminder
        await dispatchNotification({
          type: 'manager_pending_reminder',
          to: managerProfile.email,
          payload: {
            managerName: managerProfile.display_name,
            periodLabel,
            employees: uniqueEmployees.map(name => ({ name })),
            locale: 'pt-BR' as const
          }
        });

        // Log the notification
        await supabase.from('notification_log').insert({
          user_id: managerId,
          type: 'email',
          title: 'Manager Pending Reminder',
          body: `You have ${uniqueEmployees.length} employee(s) with pending timesheets for period ${periodLabel}.`,
          data: { 
            employees: uniqueEmployees,
            period: periodLabel,
            notification_type: 'manager_pending_reminder'
          }
        });

        sentCount++;
        console.log(`Sent manager reminder to ${managerProfile.display_name} (${managerProfile.email}) for ${uniqueEmployees.length} employees`);

      } catch (error) {
        console.error('Error sending manager reminder:', error);
      }
    }

  } catch (error) {
    console.error('Error in sendManagerReminders:', error);
  }

  return sentCount;
}