-- ==========================================
-- Database Setup Wizard - Validation Script
-- ==========================================
-- Purpose: Validate complete database installation
-- Dependencies: All layers (1-12)
-- Order: 99 (Run last)
-- ==========================================

-- ==========================================
-- Validation 1: Extensions
-- ==========================================
DO $$
DECLARE
  ext_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO ext_count
  FROM pg_extension
  WHERE extname IN ('uuid-ossp', 'pgcrypto');
  
  IF ext_count = 2 THEN
    RAISE NOTICE '✅ Extensions: OK (2/2)';
  ELSE
    RAISE WARNING '❌ Extensions: MISSING (% found, expected 2)', ext_count;
  END IF;
END $$;

-- ==========================================
-- Validation 2: Tables
-- ==========================================
DO $$
DECLARE
  table_count INTEGER;
  expected_tables TEXT[] := ARRAY[
    'tenants', '_migrations', 'system_config',
    'profiles', 'users_unified', 'environments', 'vessels', 'password_reset_tokens',
    'tenant_user_roles', 'tenant_settings', 'user_invitations', 'notification_preferences', 'push_subscriptions',
    'groups', 'employees',
    'manager_group_assignments', 'employee_group_members', 'vessel_group_links',
    'timesheets', 'period_locks',
    'timesheet_entries', 'approvals', 'timesheet_annotations',
    'comments', 'notifications', 'notification_log', 'audit_log'
  ];
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename = ANY(expected_tables);
  
  IF table_count = 27 THEN
    RAISE NOTICE '✅ Tables: OK (27/27)';
  ELSE
    RAISE WARNING '❌ Tables: INCOMPLETE (% found, expected 27)', table_count;
  END IF;
END $$;

-- ==========================================
-- Validation 3: Functions
-- ==========================================
DO $$
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'get_tenant_timezone',
      'get_tenant_work_mode',
      'timesheet_deadline',
      'timesheet_past_deadline',
      'now_in_tenant_timezone',
      'convert_to_tenant_timezone',
      'get_user_tenants',
      'set_tenant_context',
      'get_tenant_context',
      'cleanup_expired_reset_tokens',
      'expire_old_invitations',
      'calculate_timesheet_hours'
    );
  
  IF function_count >= 12 THEN
    RAISE NOTICE '✅ Functions: OK (%/12+)', function_count;
  ELSE
    RAISE WARNING '❌ Functions: INCOMPLETE (% found, expected 12+)', function_count;
  END IF;
END $$;

-- ==========================================
-- Validation 4: Triggers
-- ==========================================
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND NOT t.tgisinternal;
  
  IF trigger_count >= 5 THEN
    RAISE NOTICE '✅ Triggers: OK (%/5+)', trigger_count;
  ELSE
    RAISE WARNING '❌ Triggers: INCOMPLETE (% found, expected 5+)', trigger_count;
  END IF;
END $$;

-- ==========================================
-- Validation 5: Indexes
-- ==========================================
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';
  
  IF index_count >= 80 THEN
    RAISE NOTICE '✅ Indexes: OK (%/80+)', index_count;
  ELSE
    RAISE WARNING '❌ Indexes: INCOMPLETE (% found, expected 80+)', index_count;
  END IF;
END $$;

-- ==========================================
-- Validation 6: RLS Policies
-- ==========================================
DO $$
DECLARE
  policy_count INTEGER;
  rls_enabled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = true;
  
  IF policy_count >= 30 THEN
    RAISE NOTICE '✅ RLS Policies: OK (%/30+)', policy_count;
  ELSE
    RAISE WARNING '❌ RLS Policies: INCOMPLETE (% found, expected 30+)', policy_count;
  END IF;
  
  IF rls_enabled_count = 27 THEN
    RAISE NOTICE '✅ RLS Enabled: OK (27/27 tables)';
  ELSE
    RAISE WARNING '❌ RLS Enabled: INCOMPLETE (% tables, expected 27)', rls_enabled_count;
  END IF;
END $$;

-- ==========================================
-- Final Summary
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  DATABASE SETUP VALIDATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Review the messages above for any warnings.';
  RAISE NOTICE 'All ✅ marks indicate successful installation.';
  RAISE NOTICE 'Any ❌ marks require attention.';
  RAISE NOTICE '';
END $$;

