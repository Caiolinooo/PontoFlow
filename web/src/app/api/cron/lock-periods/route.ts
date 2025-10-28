import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';

/**
 * Cron job to automatically lock periods based on tenant deadline_day settings
 * 
 * This endpoint should be called daily by a cron service (e.g., Vercel Cron, GitHub Actions)
 * 
 * Authorization: Requires CRON_SECRET in headers or query params
 * 
 * Logic:
 * 1. Get all tenants with their deadline_day settings
 * 2. For each tenant, check if today is past the deadline
 * 3. If yes, lock the previous month's period
 * 4. Create period_lock record if it doesn't exist
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

    // Get all tenants with their settings
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name');

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError);
      return NextResponse.json({ error: tenantsError.message }, { status: 500 });
    }

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ message: 'No tenants found', locked: 0 });
    }

    const results = [];

    for (const tenant of tenants) {
      try {
        // Get tenant settings
        const { data: settings } = await supabase
          .from('tenant_settings')
          .select('deadline_day, auto_lock_enabled')
          .eq('tenant_id', tenant.id)
          .limit(1)
          .maybeSingle();

        // Check if auto-lock is enabled (default: true)
        const autoLockEnabled = settings?.auto_lock_enabled !== false;

        if (!autoLockEnabled) {
          results.push({
            tenant: tenant.name,
            status: 'skipped',
            reason: 'auto_lock_disabled',
          });
          continue;
        }

        // Default to 0 (last day of month) if not set
        const deadlineDay = settings?.deadline_day ?? 0;

        // Calculate the deadline date for the current month
        let deadlineDate: Date;
        if (deadlineDay === 0) {
          // Last day of current month
          deadlineDate = new Date(currentYear, currentMonth + 1, 0);
        } else {
          // Specific day of current month
          deadlineDate = new Date(currentYear, currentMonth, deadlineDay);
        }

        // Check if today is past the deadline
        const isPastDeadline = today > deadlineDate;

        if (isPastDeadline) {
          // Lock the previous month
          const previousMonth = new Date(currentYear, currentMonth - 1, 1);
          const periodMonth = previousMonth.toISOString().split('T')[0].substring(0, 7) + '-01';

          // Check if period is already locked
          const { data: existingLock } = await supabase
            .from('period_locks')
            .select('id, locked')
            .eq('tenant_id', tenant.id)
            .eq('period_month', periodMonth)
            .limit(1)
            .maybeSingle();

          if (!existingLock) {
            // Create new lock
            const { error: lockError } = await supabase
              .from('period_locks')
              .insert({
                tenant_id: tenant.id,
                period_month: periodMonth,
                locked: true,
                reason: `Travado automaticamente após o dia ${deadlineDay === 0 ? 'último do mês' : deadlineDay}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (lockError) {
              console.error(`Error locking period for tenant ${tenant.name}:`, lockError);
              results.push({
                tenant: tenant.name,
                status: 'error',
                error: lockError.message,
              });
            } else {
              results.push({
                tenant: tenant.name,
                status: 'locked',
                period: periodMonth,
                deadline: deadlineDay,
              });
            }
          } else if (!existingLock.locked) {
            // Update existing lock to locked
            const { error: updateError } = await supabase
              .from('period_locks')
              .update({
                locked: true,
                reason: `Travado automaticamente após o dia ${deadlineDay === 0 ? 'último do mês' : deadlineDay}`,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingLock.id);

            if (updateError) {
              console.error(`Error updating lock for tenant ${tenant.name}:`, updateError);
              results.push({
                tenant: tenant.name,
                status: 'error',
                error: updateError.message,
              });
            } else {
              results.push({
                tenant: tenant.name,
                status: 'updated',
                period: periodMonth,
                deadline: deadlineDay,
              });
            }
          } else {
            results.push({
              tenant: tenant.name,
              status: 'already_locked',
              period: periodMonth,
            });
          }
        } else {
          results.push({
            tenant: tenant.name,
            status: 'not_yet',
            deadline: deadlineDay,
            deadlineDate: deadlineDate.toISOString().split('T')[0],
          });
        }
      } catch (error: any) {
        console.error(`Error processing tenant ${tenant.name}:`, error);
        results.push({
          tenant: tenant.name,
          status: 'error',
          error: error.message,
        });
      }
    }

    const lockedCount = results.filter(r => r.status === 'locked' || r.status === 'updated').length;

    return NextResponse.json({
      message: 'Period lock check completed',
      timestamp: new Date().toISOString(),
      locked: lockedCount,
      results,
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

