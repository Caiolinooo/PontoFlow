-- ==========================================
-- Migration: Update RLS Policies for Soft Delete
-- ==========================================
-- Purpose: Update Row Level Security policies to exclude soft deleted records
-- Phase: 2 of 5 - Update RLS Policies
-- Date: 2025-11-07
-- ==========================================

-- ==========================================
-- IMPORTANT NOTES
-- ==========================================
-- This migration updates existing RLS policies to filter out soft deleted records
-- All SELECT policies will add: AND deleted_at IS NULL
-- This ensures deleted records are never returned to application queries
--
-- Admin/Super Admin access:
-- - Service role bypasses RLS (can see deleted records)
-- - Application code can query deleted records using service client
--
-- Rollback: Re-run previous RLS policies without deleted_at filter

BEGIN;

-- ==========================================
-- Helper Function: Check if user has admin role
-- ==========================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user has ADMIN or TENANT_ADMIN role
  -- This is a simplified check - adjust based on your auth implementation
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_user_roles tur
    WHERE tur.user_id = auth.uid()
      AND tur.role IN ('ADMIN', 'TENANT_ADMIN', 'ADMIN_GLOBAL')
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ==========================================
-- Tenants RLS Policies
-- ==========================================
-- Drop existing policies
DROP POLICY IF EXISTS tenants_select ON public.tenants;
DROP POLICY IF EXISTS tenants_insert ON public.tenants;
DROP POLICY IF EXISTS tenants_update ON public.tenants;
DROP POLICY IF EXISTS tenants_delete ON public.tenants;

-- Recreate with soft delete filter
CREATE POLICY tenants_select ON public.tenants
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY tenants_insert ON public.tenants
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY tenants_update ON public.tenants
  FOR UPDATE
  USING (is_admin() AND deleted_at IS NULL)
  WITH CHECK (is_admin());

-- Soft delete policy (only admins can soft delete)
CREATE POLICY tenants_soft_delete ON public.tenants
  FOR UPDATE
  USING (is_admin() AND deleted_at IS NULL)
  WITH CHECK (is_admin()); -- Allow setting deleted_at

-- ==========================================
-- Profiles RLS Policies
-- ==========================================
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;

-- Users can see their own profile and admins can see all active profiles
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT
  USING (
    deleted_at IS NULL AND (
      user_id = auth.uid() OR is_admin()
    )
  );

CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE
  USING (
    deleted_at IS NULL AND (
      user_id = auth.uid() OR is_admin()
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR is_admin()
  );

-- ==========================================
-- Employees RLS Policies
-- ==========================================
DROP POLICY IF EXISTS employees_select ON public.employees;
DROP POLICY IF EXISTS employees_insert ON public.employees;
DROP POLICY IF EXISTS employees_update ON public.employees;

-- Employees can see themselves, managers can see their employees, admins see all
CREATE POLICY employees_select ON public.employees
  FOR SELECT
  USING (
    deleted_at IS NULL AND (
      profile_id = auth.uid()
      OR is_admin()
      OR EXISTS (
        SELECT 1 FROM public.manager_group_assignments mga
        JOIN public.employee_group_members egm ON mga.group_id = egm.group_id
        WHERE mga.manager_id = auth.uid()
          AND egm.employee_id = employees.id
      )
    )
  );

CREATE POLICY employees_insert ON public.employees
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY employees_update ON public.employees
  FOR UPDATE
  USING (deleted_at IS NULL AND is_admin())
  WITH CHECK (is_admin());

-- ==========================================
-- Groups RLS Policies
-- ==========================================
DROP POLICY IF EXISTS groups_select ON public.groups;
DROP POLICY IF EXISTS groups_insert ON public.groups;
DROP POLICY IF EXISTS groups_update ON public.groups;

CREATE POLICY groups_select ON public.groups
  FOR SELECT
  USING (
    deleted_at IS NULL AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM public.manager_group_assignments mga
        WHERE mga.group_id = groups.id
          AND mga.manager_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.employee_group_members egm
        WHERE egm.group_id = groups.id
          AND egm.employee_id IN (
            SELECT id FROM public.employees WHERE profile_id = auth.uid()
          )
      )
    )
  );

CREATE POLICY groups_insert ON public.groups
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY groups_update ON public.groups
  FOR UPDATE
  USING (deleted_at IS NULL AND is_admin())
  WITH CHECK (is_admin());

-- ==========================================
-- Environments RLS Policies
-- ==========================================
DROP POLICY IF EXISTS environments_select ON public.environments;
DROP POLICY IF EXISTS environments_insert ON public.environments;
DROP POLICY IF EXISTS environments_update ON public.environments;

CREATE POLICY environments_select ON public.environments
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY environments_insert ON public.environments
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY environments_update ON public.environments
  FOR UPDATE
  USING (deleted_at IS NULL AND is_admin())
  WITH CHECK (is_admin());

-- ==========================================
-- Timesheets RLS Policies
-- ==========================================
DROP POLICY IF EXISTS timesheets_select ON public.timesheets;
DROP POLICY IF EXISTS timesheets_insert ON public.timesheets;
DROP POLICY IF EXISTS timesheets_update ON public.timesheets;

-- Employees see their own, managers see their team's, admins see all
CREATE POLICY timesheets_select ON public.timesheets
  FOR SELECT
  USING (
    deleted_at IS NULL AND (
      is_admin()
      OR employee_id IN (
        SELECT id FROM public.employees WHERE profile_id = auth.uid() AND deleted_at IS NULL
      )
      OR employee_id IN (
        SELECT egm.employee_id
        FROM public.manager_group_assignments mga
        JOIN public.employee_group_members egm ON mga.group_id = egm.group_id
        WHERE mga.manager_id = auth.uid()
      )
    )
  );

CREATE POLICY timesheets_insert ON public.timesheets
  FOR INSERT
  WITH CHECK (
    employee_id IN (
      SELECT id FROM public.employees WHERE profile_id = auth.uid() AND deleted_at IS NULL
    )
    OR is_admin()
  );

CREATE POLICY timesheets_update ON public.timesheets
  FOR UPDATE
  USING (
    deleted_at IS NULL AND (
      employee_id IN (
        SELECT id FROM public.employees WHERE profile_id = auth.uid() AND deleted_at IS NULL
      )
      OR is_admin()
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM public.employees WHERE profile_id = auth.uid() AND deleted_at IS NULL
    )
    OR is_admin()
  );

-- ==========================================
-- Timesheet Entries RLS Policies
-- ==========================================
DROP POLICY IF EXISTS timesheet_entries_select ON public.timesheet_entries;
DROP POLICY IF EXISTS timesheet_entries_insert ON public.timesheet_entries;
DROP POLICY IF EXISTS timesheet_entries_update ON public.timesheet_entries;

CREATE POLICY timesheet_entries_select ON public.timesheet_entries
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    timesheet_id IN (
      SELECT id FROM public.timesheets WHERE deleted_at IS NULL
    )
  );

CREATE POLICY timesheet_entries_insert ON public.timesheet_entries
  FOR INSERT
  WITH CHECK (
    timesheet_id IN (
      SELECT id FROM public.timesheets WHERE deleted_at IS NULL
    )
  );

CREATE POLICY timesheet_entries_update ON public.timesheet_entries
  FOR UPDATE
  USING (
    deleted_at IS NULL AND
    timesheet_id IN (
      SELECT id FROM public.timesheets WHERE deleted_at IS NULL
    )
  )
  WITH CHECK (
    timesheet_id IN (
      SELECT id FROM public.timesheets WHERE deleted_at IS NULL
    )
  );

-- ==========================================
-- Vessels RLS Policies (if table exists)
-- ==========================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vessels') THEN
    EXECUTE 'DROP POLICY IF EXISTS vessels_select ON public.vessels';
    EXECUTE 'DROP POLICY IF EXISTS vessels_insert ON public.vessels';
    EXECUTE 'DROP POLICY IF EXISTS vessels_update ON public.vessels';

    EXECUTE 'CREATE POLICY vessels_select ON public.vessels
      FOR SELECT
      USING (deleted_at IS NULL)';

    EXECUTE 'CREATE POLICY vessels_insert ON public.vessels
      FOR INSERT
      WITH CHECK (is_admin())';

    EXECUTE 'CREATE POLICY vessels_update ON public.vessels
      FOR UPDATE
      USING (deleted_at IS NULL AND is_admin())
      WITH CHECK (is_admin())';
  END IF;
END $$;

-- ==========================================
-- Success Message
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Soft Delete Migration - Phase 2 Complete';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'RLS Policies updated to filter soft deleted records:';
  RAISE NOTICE '  - tenants';
  RAISE NOTICE '  - profiles';
  RAISE NOTICE '  - employees';
  RAISE NOTICE '  - groups';
  RAISE NOTICE '  - environments';
  RAISE NOTICE '  - timesheets';
  RAISE NOTICE '  - timesheet_entries';
  RAISE NOTICE '  - vessels (if exists)';
  RAISE NOTICE '';
  RAISE NOTICE 'All SELECT policies now filter: deleted_at IS NULL';
  RAISE NOTICE 'Service role can still access deleted records';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  Phase 3: Update application helper functions';
  RAISE NOTICE '  Phase 4: Update API endpoints to use soft delete';
  RAISE NOTICE '  Phase 5: Review and remove CASCADE constraints';
  RAISE NOTICE '==============================================';
END $$;

COMMIT;
