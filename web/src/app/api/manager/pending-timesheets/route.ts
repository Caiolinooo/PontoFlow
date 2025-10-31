import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { cacheService } from '@/lib/cache/service';
import {
  calculateCurrentTimesheetPeriod,
  getPeriodStatus
} from '@/lib/periods/calculator';
import { formatTimesheetPeriodDisplay } from '@/lib/timezone/utils';

// Cache key prefix for this endpoint
const CACHE_PREFIX = 'manager_pending_timesheets';

/**
 * GET /api/manager/pending-timesheets
 * Returns pending timesheets for managers to review
 * Supports filtering by custom tenant periods and status
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN', 'MANAGER', 'MANAGER_TIMESHEET']);
    const supabase = getServiceSupabase();

    console.log('[PENDING TIMESHEETS] User:', {
      id: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id
    });

    if (!user.tenant_id) {
      console.error('[PENDING TIMESHEETS] Missing tenant_id for user:', user.id);
      return NextResponse.json(
        { error: 'missing_tenant', message: 'Usuário sem tenant definido' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM format
    const statusParam = searchParams.get('status') || 'enviado';
    // Map Portuguese status to English (database uses English)
    const statusMap: Record<string, string> = {
      'rascunho': 'draft',
      'enviado': 'submitted',
      'aprovado': 'approved',
      'recusado': 'rejected'
    };
    const status = statusMap[statusParam] || statusParam;
    const employeeId = searchParams.get('employeeId');

    console.log('[PENDING TIMESHEETS] Status mapping:', { statusParam, status });
    
    // Build cache key
    const cacheKey = `${CACHE_PREFIX}:${user.tenant_id}:${month || 'current'}:${status}:${employeeId || 'all'}`;
    
    // Try to get from cache first (5 minute TTL)
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Get tenant settings for custom deadline configuration with fallbacks
    let deadlineDay = 16; // Default: 16th for ABZ Group
    let tenantTimezone = 'America/Sao_Paulo';
    
    try {
      const { data: tenantSettings } = await supabase
        .from('tenant_settings')
        .select('deadline_day, timezone')
        .eq('tenant_id', user.tenant_id)
        .single();
        
      if (tenantSettings) {
        deadlineDay = tenantSettings?.deadline_day ?? 16;
        tenantTimezone = tenantSettings?.timezone || 'America/Sao_Paulo';
      }
    } catch (err) {
      console.warn('Could not fetch tenant_settings, using defaults:', err);
      deadlineDay = 16;
      tenantTimezone = 'America/Sao_Paulo';
    }
    
    // Also try to get from tenants table if available
    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('timezone, deadline_day, work_mode')
        .eq('id', user.tenant_id)
        .single();
        
      if (tenant) {
        tenantTimezone = tenant?.timezone || tenantTimezone;
        deadlineDay = tenant?.deadline_day || deadlineDay;
      }
    } catch (err) {
      console.warn('Could not fetch from tenants table, using defaults:', err);
    }

    // Calculate current period using custom deadline rules
    const currentPeriod = calculateCurrentTimesheetPeriod(tenantTimezone, deadlineDay);
    const periodStatus = getPeriodStatus(currentPeriod.startDate, currentPeriod.endDate, tenantTimezone, deadlineDay);
    
    // Resolve time period
    let periodStart: string;
    let periodEnd: string;

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      // For specific month, use the calendar month range to catch all timesheets
      // that intersect with this month, regardless of their period configuration
      const [year, monthNum] = month.split('-').map(Number);
      periodStart = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      // Get last day of month
      const lastDay = new Date(year, monthNum, 0).getDate();
      periodEnd = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else {
      // Use current active period
      periodStart = currentPeriod.startDate;
      periodEnd = currentPeriod.endDate;
    }
  
    // Add input validation and safety checks
    if (!user.tenant_id && user.role === 'MANAGER') {
      console.warn('Manager user missing tenant_id:', user.id);
      return NextResponse.json({
        error: 'Configuração de tenant incompleta',
        details: 'Usuário gerente sem tenant_id definido'
      }, { status: 500 });
    }

    // Build base query with proper joins - simplified to avoid errors
    // Use intersection logic: timesheet intersects with period if:
    // - timesheet starts before or during period AND
    // - timesheet ends during or after period
    let query = supabase
      .from('timesheets')
      .select(`
        id,
        employee_id,
        periodo_ini,
        periodo_fim,
        status,
        created_at,
        updated_at,
        tenant_id,
        employee:employees!timesheets_employee_id_fkey(
          id,
          cargo,
          centro_custo,
          profiles!employees_profile_fk(
            display_name,
            email
          )
        )
      `)
      .eq('tenant_id', user.tenant_id)
      .eq('status', status)
      .lte('periodo_ini', periodEnd)    // Timesheet starts before or during period
      .gte('periodo_fim', periodStart)  // Timesheet ends during or after period
      .order('created_at', { ascending: false });

    // Apply role-based filtering
    if (user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') {
      // For managers, we need to filter by their assigned groups
      let managerGroupsQuery = supabase
        .from('manager_group_assignments')
        .select('group_id, tenant_id')
        .eq('manager_id', user.id);

      // Check if tenant_id column exists (after migration) with fallback
      try {
        // Dynamic column detection to support both pre and post-migration databases
        const { data: hasTenantId } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'manager_group_assignments')
          .eq('column_name', 'tenant_id')
          .maybeSingle();

        if (hasTenantId) {
          // Use optimized query with tenant_id (after migration)
          managerGroupsQuery = managerGroupsQuery.eq('tenant_id', user.tenant_id);
        } else {
          // Fallback: use join-based approach for pre-migration databases
          console.warn('Migration not applied - using fallback query logic');
        }
      } catch (error) {
        console.warn('Could not detect tenant_id column, using fallback logic:', error);
      }

      const { data: managerGroups, error: managerGroupsError } = await managerGroupsQuery;

      if (managerGroupsError) {
        console.error('Error fetching manager groups:', managerGroupsError);
        return NextResponse.json({
          error: 'Erro ao buscar grupos do gerente',
          details: managerGroupsError.message
        }, { status: 500 });
      }

      const groupIds = managerGroups?.map(g => g.group_id) || [];
      
      if (groupIds.length === 0) {
        return NextResponse.json({
          pending_timesheets: [],
          total: 0,
          message: 'Nenhum grupo atribuído ao gerente'
        });
      }

      // Get employees in manager's groups with tenant-aware filtering
      let groupMembersQuery = supabase
        .from('employee_group_members')
        .select('employee_id, tenant_id')
        .in('group_id', groupIds);

      try {
        // Reuse tenant_id detection result for consistency
        const { data: hasTenantId } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'employee_group_members')
          .eq('column_name', 'tenant_id')
          .maybeSingle();

        if (hasTenantId) {
          // Use optimized query with tenant_id (after migration)
          groupMembersQuery = groupMembersQuery.eq('tenant_id', user.tenant_id);
        } else {
          // Fallback: let RLS policies handle filtering for pre-migration databases
          console.warn('Using fallback for employee_group_members - migration may not be applied');
        }
      } catch (error) {
        console.warn('Could not detect tenant_id in employee_group_members, using fallback:', error);
      }

      const { data: groupMembers, error: groupMembersError } = await groupMembersQuery;

      if (groupMembersError) {
        console.error('Error fetching group members:', groupMembersError);
        return NextResponse.json({
          error: 'Erro ao buscar membros dos grupos',
          details: groupMembersError.message
        }, { status: 500 });
      }

      const employeeIds = groupMembers?.map(m => m.employee_id) || [];
      
      if (employeeIds.length === 0) {
        return NextResponse.json({
          pending_timesheets: [],
          total: 0,
          message: 'Nenhum funcionário nos grupos atribuídos'
        });
      }

      query = query.in('employee_id', employeeIds);
    }

    // Additional filters
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const queryStartTime = Date.now();

    const { data: timesheets, error } = await query;

    if (error) {
      console.error('Error fetching pending timesheets:', error);
      return NextResponse.json(
        { error: 'database_error', message: error.message },
        { status: 500 }
      );
    }

    // Enhanced Error Handling and Logging
    console.log('Pending timesheets query:', {
      userRole: user.role,
      userId: user.id,
      tenantId: user.tenant_id,
      deadlineDay,
      timezone: tenantTimezone,
      periodStart,
      periodEnd,
      status: 'enviado',
      timestamp: new Date().toISOString()
    });

    console.log('[PENDING TIMESHEETS] Query result:', {
      count: timesheets?.length || 0,
      timesheets: timesheets?.map(t => ({
        id: t.id,
        employee_id: t.employee_id,
        status: t.status,
        periodo_ini: t.periodo_ini
      }))
    });

    // Process and format the response
    const processedTimesheets = (timesheets || []).map(timesheet => {
      const employee = timesheet.employee as any;
      const profile = employee?.profiles as any;

      return {
        id: timesheet.id,
        employee_id: timesheet.employee_id,
        periodo_ini: timesheet.periodo_ini,
        periodo_fim: timesheet.periodo_fim,
        status: timesheet.status,
        created_at: timesheet.created_at,
        updated_at: timesheet.updated_at,
        employee: {
          id: employee?.id,
          display_name: profile?.display_name || profile?.email || 'Nome não informado',
          email: profile?.email,
          cargo: employee?.cargo,
          centro_custo: employee?.centro_custo,
          profile_id: employee?.profile_id
        },
        entries_count: 0, // Will be loaded on demand if needed
        has_entries: false, // Will be updated if needed
        // Add period context for each timesheet
        period_context: {
          is_current_period: timesheet.periodo_ini === currentPeriod.startDate && timesheet.periodo_fim === currentPeriod.endDate,
          days_until_deadline: getPeriodStatus(timesheet.periodo_ini, timesheet.periodo_fim, tenantTimezone, deadlineDay).daysUntilDeadline,
          urgency_level: getPeriodStatus(timesheet.periodo_ini, timesheet.periodo_fim, tenantTimezone, deadlineDay).urgencyLevel
        }
      };
    });

    const queryEndTime = Date.now();
    console.log(`Pending timesheets query completed in ${queryEndTime - queryStartTime}ms`);

    // Enhanced Response Format with debugging information and period context
    const response = {
      pending_timesheets: processedTimesheets,
      total: processedTimesheets.length,
      metadata: {
        query_info: {
          user_role: user.role,
          groups_found: (user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') ? 'manager_filtering_applied' : 'admin_no_filtering',
          employees_found: processedTimesheets.length,
          month_filter: month || currentPeriod.periodKey,
          status_filter: 'enviado',
          query_duration_ms: queryEndTime - queryStartTime
        },
        period_context: {
          deadline_day: deadlineDay,
          timezone: tenantTimezone,
          current_period: {
            start: currentPeriod.startDate,
            end: currentPeriod.endDate,
            label: formatTimesheetPeriodDisplay(currentPeriod.startDate, currentPeriod.endDate, tenantTimezone)
          },
          period_status: periodStatus,
          is_transition_period: currentPeriod.isTransitionPeriod,
          mandatory_approval_required: periodStatus.status === 'closing_soon' || periodStatus.status === 'overdue'
        },
        server_timestamp: new Date().toISOString()
      },
      filters: {
        month: month || currentPeriod.periodKey,
        status,
        employeeId: employeeId || null,
        userRole: user.role
      },
      timestamp: new Date().toISOString()
    };

    // Cache for 5 minutes
    await cacheService.set(cacheKey, response, 300);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in pending timesheets API:', error);
    
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      const status = error.message === 'Unauthorized' ? 401 : 403;
      return NextResponse.json(
        { error: error.message.toLowerCase() }, 
        { status }
      );
    }

    return NextResponse.json(
      { error: 'internal_error', message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/manager/pending-timesheets
 * Batch operations on pending timesheets (approve/reject multiple)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN', 'MANAGER', 'MANAGER_TIMESHEET']);
    const supabase = getServiceSupabase();

    if (!user.tenant_id) {
      return NextResponse.json(
        { error: 'missing_tenant', message: 'Usuário sem tenant definido' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { action, timesheetIds, reason } = body;

    if (!action || !timesheetIds || !Array.isArray(timesheetIds)) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Action e timesheetIds são obrigatórios' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'invalid_action', message: 'Action deve ser approve ou reject' },
        { status: 400 }
      );
    }

    // Validate timesheetIds exist and are accessible
    const { data: accessibleTimesheets, error: fetchError } = await supabase
      .from('timesheets')
      .select('id, status, tenant_id')
      .in('id', timesheetIds)
      .eq('tenant_id', user.tenant_id)
      .eq('status', 'enviado');

    if (fetchError) {
      return NextResponse.json(
        { error: 'database_error', message: fetchError.message },
        { status: 500 }
      );
    }

    if (!accessibleTimesheets || accessibleTimesheets.length !== timesheetIds.length) {
      return NextResponse.json(
        { error: 'invalid_timesheets', message: 'Alguns timesheets não foram encontrados ou não são acessíveis' },
        { status: 400 }
      );
    }

    // Perform batch update
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    const { data: updatedTimesheets, error: updateError } = await supabase
      .from('timesheets')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .in('id', timesheetIds)
      .select('id, employee_id, status');

    if (updateError) {
      return NextResponse.json(
        { error: 'update_failed', message: updateError.message },
        { status: 500 }
      );
    }

    // Create audit entries for each timesheet
    const auditEntries = updatedTimesheets?.map(timesheet => ({
      timesheet_id: timesheet.id,
      manager_id: user.id,
      status: action,
      reason: reason || null,
      created_at: new Date().toISOString()
    })) || [];

    if (auditEntries.length > 0) {
      const { error: auditError } = await supabase
        .from('approvals')
        .insert(auditEntries);

      if (auditError) {
        console.warn('Failed to create audit entries:', auditError);
        // Don't fail the whole operation for audit issues
      }
    }

    // Invalidate cache for this user's pending timesheets
    const cacheKeyPattern = `${CACHE_PREFIX}:${user.tenant_id}:*`;
    await cacheService.invalidate(cacheKeyPattern);

    return NextResponse.json({
      success: true,
      action,
      processed_count: updatedTimesheets?.length || 0,
      timesheet_ids: timesheetIds,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in batch operation:', error);
    
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      const status = error.message === 'Unauthorized' ? 401 : 403;
      return NextResponse.json(
        { error: error.message.toLowerCase() }, 
        { status }
      );
    }

    return NextResponse.json(
      { error: 'internal_error', message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
