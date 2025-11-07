import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getApiUser } from '@/lib/auth/server';
import { calculateTimesheetPeriods } from '@/lib/periods/calculator';

/**
 * GET /api/reports/periods
 * Returns available periods based on tenant deadline configuration
 * Supports both year list and custom periods
 * Query params:
 *   - year: filter periods by specific year
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getServerSupabase();
    const searchParams = req.nextUrl.searchParams;
    const yearFilter = searchParams.get('year');

    // Get tenant settings for deadline configuration
    const { data: tenant } = await supabase
      .from('tenants')
      .select('timezone, deadline_day')
      .eq('id', user.tenant_id)
      .maybeSingle();

    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('deadline_day')
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    const tenantTimezone = tenant?.timezone || 'America/Sao_Paulo';
    const deadlineDay = settings?.deadline_day ?? tenant?.deadline_day ?? 16;

    // Fetch all timesheets to determine available date range
    const { data: timesheets, error } = await supabase
      .from('timesheets')
      .select('periodo_ini, periodo_fim')
      .eq('tenant_id', user.tenant_id)
      .order('periodo_ini', { ascending: false });

    if (error) {
      console.error('[PERIODS API] Error fetching timesheets:', error);
      return NextResponse.json({ error: 'Failed to fetch periods' }, { status: 500 });
    }

    // Get current date for reference
    const now = new Date();
    const currentYear = now.getFullYear();

    // Determine date range for period calculation
    let earliestDate: Date;
    let latestDate: Date;
    const yearSet = new Set<number>();

    if (!timesheets || timesheets.length === 0) {
      // No timesheets yet - use current year and previous year
      earliestDate = new Date(currentYear - 1, 0, 1);
      latestDate = new Date(currentYear, 11, 31);
      yearSet.add(currentYear - 1);
      yearSet.add(currentYear);
    } else {
      // Find earliest and latest dates from timesheets
      const dates = timesheets.map(ts => new Date(ts.periodo_ini));
      earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
      latestDate = new Date(Math.max(...dates.map(d => d.getTime())));

      // Extract unique years from timesheets
      timesheets.forEach((ts) => {
        const date = new Date(ts.periodo_ini);
        yearSet.add(date.getFullYear());
      });

      // Always include current year even if no timesheets for it
      yearSet.add(currentYear);

      // Extend latest date to include current year if needed
      if (latestDate.getFullYear() < currentYear) {
        latestDate = new Date(currentYear, 11, 31);
      }
    }

    const years = Array.from(yearSet).sort((a, b) => b - a);

    // Calculate custom periods based on tenant deadline
    // Include 1 month before earliest and 2 months after latest to ensure coverage
    const startDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth() - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(latestDate.getFullYear(), latestDate.getMonth() + 2, 1).toISOString().split('T')[0];

    const allPeriods = calculateTimesheetPeriods(
      tenantTimezone,
      deadlineDay,
      startDate,
      endDate
    );

    // Filter periods by year if specified
    let filteredPeriods = allPeriods;
    if (yearFilter) {
      filteredPeriods = allPeriods.filter(period => {
        const periodYear = new Date(period.startDate).getFullYear();
        return periodYear.toString() === yearFilter;
      });
    }

    // Format periods for frontend
    const periods = filteredPeriods.map(period => {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);

      return {
        startDate: period.startDate,
        endDate: period.endDate,
        periodKey: period.periodKey,
        label: formatPeriodLabel(startDate, endDate, deadlineDay),
        isCurrent: period.isTransitionPeriod,
      };
    });

    // Identify current period
    const currentPeriod = periods.find(p => p.isCurrent) || null;

    return NextResponse.json({
      years,
      periods,
      currentPeriod,
      deadlineDay,
    });
  } catch (err) {
    console.error('[PERIODS API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Format period label based on deadline day
 * Examples:
 *   - Deadline 16: "16/Out/2025 - 15/Nov/2025"
 *   - Deadline 0: "Outubro 2025"
 */
function formatPeriodLabel(startDate: Date, endDate: Date, deadlineDay: number): string {
  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  if (deadlineDay === 0) {
    // Calendar month
    return `${monthNames[startDate.getMonth()]}/${startDate.getFullYear()}`;
  }

  // Custom period
  const startDay = startDate.getDate();
  const startMonth = monthNames[startDate.getMonth()];
  const startYear = startDate.getFullYear();

  const endDay = endDate.getDate();
  const endMonth = monthNames[endDate.getMonth()];
  const endYear = endDate.getFullYear();

  if (startYear === endYear) {
    return `${startDay}/${startMonth} - ${endDay}/${endMonth}/${endYear}`;
  }

  return `${startDay}/${startMonth}/${startYear} - ${endDay}/${endMonth}/${endYear}`;
}

