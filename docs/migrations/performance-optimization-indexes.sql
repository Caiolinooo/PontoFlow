-- Performance Optimization Script for Timesheet Manager
-- This script adds indexes to improve query performance based on the analysis

-- Enable concurrent index creation to avoid locking
SET statement_timeout = '0';
SET lock_timeout = '0';
SET idle_in_transaction_session_timeout = '0';

-- =============================================================================
-- TIMESHHEETS TABLE OPTIMIZATION
-- =============================================================================

-- Primary index for tenant-based filtering (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheets_tenant_status_periodo 
ON timesheets(tenant_id, status, periodo_ini, periodo_fim) 
WHERE tenant_id IS NOT NULL;

-- Index for employee timesheet lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheets_employee_periodo 
ON timesheets(employee_id, periodo_ini, periodo_fim);

-- Index for status-based reporting queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheets_status_periodo 
ON timesheets(status, periodo_ini, periodo_fim);

-- Composite index for manager pending timesheets
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheets_manager_pending 
ON timesheets(tenant_id, status, created_at) 
WHERE status IN ('enviado', 'rascunho');

-- Index for timesheet approval workflows
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheets_approval_workflow 
ON timesheets(tenant_id, employee_id, status, updated_at);

-- =============================================================================
-- EMPLOYEES TABLE OPTIMIZATION
-- =============================================================================

-- Index for employee lookups by tenant and profile
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_tenant_profile 
ON employees(tenant_id, profile_id);

-- Index for employee search by name/display name
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_tenant_name 
ON employees(tenant_id, display_name);

-- Index for tenant-based employee filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_tenant_active 
ON employees(tenant_id, profile_id) 
WHERE profile_id IS NOT NULL;

-- =============================================================================
-- PROFILES TABLE OPTIMIZATION
-- =============================================================================

-- Index for profile lookup by user_id (primary key access)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_id 
ON profiles(user_id);

-- Index for profile search by email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email 
ON profiles(email) 
WHERE email IS NOT NULL;

-- Index for active user filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_active_locale 
ON profiles(ativo, locale) 
WHERE ativo = true;

-- =============================================================================
-- TIMESHEET_ENTRIES TABLE OPTIMIZATION  
-- =============================================================================

-- Index for timesheet entries by timesheet_id (most common join)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheet_entries_timesheet 
ON timesheet_entries(timesheet_id, data);

-- Index for date-based entry queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheet_entries_date_tipo 
ON timesheet_entries(data, tipo);

-- Index for tenant-based entry filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheet_entries_tenant 
ON timesheet_entries(tenant_id, timesheet_id);

-- Index for entry type queries (EMBARQUE, DESEMBARQUE, etc.)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheet_entries_tipo_data 
ON timesheet_entries(tipo, data);

-- =============================================================================
-- GROUPS AND MEMBERSHIPS OPTIMIZATION
-- =============================================================================

-- Index for group lookups by tenant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_groups_tenant_name 
ON groups(tenant_id, name);

-- Index for employee group memberships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_group_members_employee 
ON employee_group_members(employee_id, group_id);

-- Index for manager group assignments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manager_group_assignments_manager 
ON manager_group_assignments(manager_id, group_id);

-- =============================================================================
-- APPROVALS AND ANNOTATIONS OPTIMIZATION
-- =============================================================================

-- Index for timesheet approval queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approvals_timesheet_manager 
ON approvals(timesheet_id, manager_id, status);

-- Index for approval history by tenant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approvals_tenant_created 
ON approvals(tenant_id, created_at);

-- Index for timesheet annotations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheet_annotations_timesheet 
ON timesheet_annotations(timesheet_id, created_at);

-- Index for annotation authors
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheet_annotations_created_by 
ON timesheet_annotations(created_by, created_at);

-- =============================================================================
-- ENVIRONMENTS AND VESSELS OPTIMIZATION
-- =============================================================================

-- Index for environments by tenant and slug
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_environments_tenant_slug 
ON environments(tenant_id, slug);

-- Index for vessel lookups by tenant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessels_tenant_name 
ON vessels(tenant_id, name);

-- =============================================================================
-- NOTIFICATIONS OPTIMIZATION
-- =============================================================================

-- Index for user notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_lido 
ON notifications(user_id, lido, criado_em);

-- Index for tenant-based notification filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_tenant_tipo 
ON notifications(tenant_id, tipo, criado_em);

-- Index for unread notification counts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread 
ON notifications(user_id, lido, criado_em) 
WHERE lido = false;

-- =============================================================================
-- WORK SCHEDULE OPTIMIZATION
-- =============================================================================

-- Index for work schedules if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'work_schedules') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_schedules_employee 
        ON work_schedules(employee_id, start_date, work_schedule);
    END IF;
END
$$;

-- =============================================================================
-- MANAGER DELEGATION OPTIMIZATION
-- =============================================================================

-- Index for manager assignments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manager_assignments_effective 
ON manager_group_assignments(manager_id, group_id);

-- Index for employee-group relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_group_effective 
ON employee_group_members(employee_id, group_id);

-- =============================================================================
-- PARTIAL INDEXES FOR SPECIFIC USE CASES
-- =============================================================================

-- Index for draft timesheets only (smaller index, faster queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheets_draft_active 
ON timesheets(tenant_id, employee_id, periodo_ini) 
WHERE status = 'rascunho';

-- Index for submitted timesheets only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheets_submitted_active 
ON timesheets(tenant_id, employee_id, created_at) 
WHERE status = 'enviado';

-- Index for current month timesheets
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheets_current_month 
ON timesheets(tenant_id, periodo_ini, periodo_fim) 
WHERE periodo_ini >= date_trunc('month', CURRENT_DATE);

-- =============================================================================
-- PERFORMANCE MONITORING INDEXES
-- =============================================================================

-- Analyze table statistics for query planner
ANALYZE timesheets;
ANALYZE employees;  
ANALYZE profiles;
ANALYZE timesheet_entries;
ANALYZE groups;
ANALYZE employee_group_members;
ANALYZE manager_group_assignments;
ANALYZE approvals;
ANALYZE timesheet_annotations;
ANALYZE environments;
ANALYZE vessels;
ANALYZE notifications;

-- =============================================================================
-- CLEANUP AND VERIFICATION
-- =============================================================================

-- Check for unused indexes (if pg_stat_user_indexes extension is available)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_extension WHERE extname = 'pg_stat_user_indexes') THEN
        RAISE NOTICE 'To find unused indexes, run: 
        SELECT schemaname, tablename, indexname, idx_scan 
        FROM pg_stat_user_indexes 
        WHERE idx_scan = 0 
        AND indexname NOT LIKE ''%%_pkey'' 
        AND schemaname = ''public'';';
    END IF;
END
$$;

-- Show created indexes
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

RAISE NOTICE 'Performance optimization indexes created successfully!';
RAISE NOTICE 'Review the unused indexes query above after the system has been running for a while.';