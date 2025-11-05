-- ==========================================
-- Database Setup Wizard - ROLLBACK Script
-- ==========================================
-- ⚠️  WARNING: This script will DROP ALL database objects
-- ⚠️  This action is IRREVERSIBLE and will DELETE ALL DATA
-- ⚠️  Only run this in development/testing environments
-- ==========================================
-- Purpose: Complete rollback of database setup
-- Order: Reverse dependency order (12 → 1)
-- ==========================================

-- Confirmation check
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  ⚠️  DATABASE ROLLBACK SCRIPT';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'This will DELETE ALL database objects and data.';
  RAISE NOTICE 'Press Ctrl+C NOW to cancel.';
  RAISE NOTICE 'Waiting 5 seconds...';
  RAISE NOTICE '';
  PERFORM pg_sleep(5);
END $$;

-- ==========================================
-- Step 1: Drop RLS Policies (Layer 12)
-- ==========================================
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Dropping RLS policies...';
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
  RAISE NOTICE '✅ RLS policies dropped';
END $$;

-- ==========================================
-- Step 2: Drop Indexes (Layer 11)
-- ==========================================
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Dropping indexes...';
  FOR r IN (
    SELECT schemaname, indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
  ) LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I.%I', r.schemaname, r.indexname);
  END LOOP;
  RAISE NOTICE '✅ Indexes dropped';
END $$;

-- ==========================================
-- Step 3: Drop Triggers (Layer 10)
-- ==========================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_sync_to_users_unified ON public.profiles;
DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
DROP TRIGGER IF EXISTS user_invitations_updated_at ON public.user_invitations;
DROP TRIGGER IF EXISTS period_locks_before_update ON public.period_locks;

RAISE NOTICE '✅ Triggers dropped';

-- ==========================================
-- Step 4: Drop Functions (Layer 9)
-- ==========================================
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_to_users_unified() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_invitations_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.period_locks_bu() CASCADE;
DROP FUNCTION IF EXISTS public.get_tenant_timezone(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_tenant_work_mode(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.timesheet_deadline(DATE, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.timesheet_past_deadline(DATE, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.now_in_tenant_timezone(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.convert_to_tenant_timezone(TIMESTAMPTZ, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_tenants(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.set_tenant_context(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_tenant_context() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_reset_tokens() CASCADE;
DROP FUNCTION IF EXISTS public.expire_old_invitations() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_timesheet_hours(UUID) CASCADE;

RAISE NOTICE '✅ Functions dropped';

-- ==========================================
-- Step 5: Drop Tables (Layers 8-1, reverse order)
-- ==========================================
-- Layer 8: Communication & Audit
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.notification_log CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;

-- Layer 7: Timesheet Details
DROP TABLE IF EXISTS public.timesheet_annotations CASCADE;
DROP TABLE IF EXISTS public.approvals CASCADE;
DROP TABLE IF EXISTS public.timesheet_entries CASCADE;

-- Layer 6: Timesheets & Periods
DROP TABLE IF EXISTS public.period_locks CASCADE;
DROP TABLE IF EXISTS public.timesheets CASCADE;

-- Layer 5: Assignments
DROP TABLE IF EXISTS public.vessel_group_links CASCADE;
DROP TABLE IF EXISTS public.employee_group_members CASCADE;
DROP TABLE IF EXISTS public.manager_group_assignments CASCADE;

-- Layer 4: Groups & Employees
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;

-- Layer 3: Roles & Settings
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.user_invitations CASCADE;
DROP TABLE IF EXISTS public.tenant_settings CASCADE;
DROP TABLE IF EXISTS public.tenant_user_roles CASCADE;

-- Layer 2: User & Environment
DROP TABLE IF EXISTS public.password_reset_tokens CASCADE;
DROP TABLE IF EXISTS public.vessels CASCADE;
DROP TABLE IF EXISTS public.environments CASCADE;
DROP TABLE IF EXISTS public.users_unified CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Layer 1: Root Tables
DROP TABLE IF EXISTS public.system_config CASCADE;
DROP TABLE IF EXISTS public._migrations CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;

RAISE NOTICE '✅ Tables dropped';

-- ==========================================
-- Step 6: Drop Extensions (Optional)
-- ==========================================
-- Uncomment if you want to drop extensions
-- DROP EXTENSION IF EXISTS "pgcrypto";
-- DROP EXTENSION IF EXISTS "uuid-ossp";
-- RAISE NOTICE '✅ Extensions dropped';

-- ==========================================
-- Final Summary
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  DATABASE ROLLBACK COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All database objects have been removed.';
  RAISE NOTICE 'The database is now in a clean state.';
  RAISE NOTICE '';
END $$;

