-- ==========================================
-- Migration: Remove CASCADE Constraints (Phase 5)
-- ==========================================
-- Purpose: Remove ON DELETE CASCADE to prevent accidental hard deletes
-- Phase: 5 of 5 - Remove CASCADE constraints
-- Date: 2025-11-07
-- ==========================================

-- ==========================================
-- IMPORTANT WARNINGS
-- ==========================================
-- This migration removes CASCADE constraints from foreign keys
-- After this migration, you MUST use soft delete helpers for cascade behavior
-- Hard deletes will fail if child records exist (ON DELETE RESTRICT)
--
-- RUN THIS ONLY AFTER:
-- 1. Phase 1-4 are complete
-- 2. All APIs updated to use soft delete
-- 3. Thorough testing in staging environment
--
-- ROLLBACK: Re-add CASCADE constraints if issues occur

BEGIN;

-- ==========================================
-- Strategy: Drop and Recreate Foreign Keys
-- ==========================================
-- We cannot ALTER a constraint's ON DELETE behavior
-- Must drop the constraint and recreate with RESTRICT

-- ==========================================
-- Environments Table
-- ==========================================
-- Before: ON DELETE CASCADE
-- After: ON DELETE RESTRICT (requires manual soft delete)

ALTER TABLE public.environments
  DROP CONSTRAINT IF EXISTS environments_tenant_id_fkey;

ALTER TABLE public.environments
  ADD CONSTRAINT environments_tenant_id_fkey
    FOREIGN KEY (tenant_id)
    REFERENCES public.tenants(id)
    ON DELETE RESTRICT; -- Changed from CASCADE

COMMENT ON CONSTRAINT environments_tenant_id_fkey ON public.environments
  IS 'Tenant FK - RESTRICT: Must soft delete tenant and environments separately';

-- ==========================================
-- Employees Table
-- ==========================================

-- Tenant FK
ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_tenant_id_fkey;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_tenant_id_fkey
    FOREIGN KEY (tenant_id)
    REFERENCES public.tenants(id)
    ON DELETE RESTRICT;

-- Profile FK (keep CASCADE - if auth user deleted, employee should be too)
-- This one stays as CASCADE because it's tied to auth.users
-- If user is deleted from auth, their employee record should go too

-- Vessel FK - change to SET NULL (vessel deleted = employee stays, vessel cleared)
ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_vessel_id_fkey;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_vessel_id_fkey
    FOREIGN KEY (vessel_id)
    REFERENCES public.vessels(id)
    ON DELETE SET NULL; -- This one is fine

-- ==========================================
-- Groups Table
-- ==========================================

ALTER TABLE public.groups
  DROP CONSTRAINT IF EXISTS groups_tenant_id_fkey;

ALTER TABLE public.groups
  ADD CONSTRAINT groups_tenant_id_fkey
    FOREIGN KEY (tenant_id)
    REFERENCES public.tenants(id)
    ON DELETE RESTRICT;

-- Environment FK - keep SET NULL (environment deleted = group stays)
-- This is fine as-is

-- ==========================================
-- Manager/Employee Group Assignments
-- ==========================================

-- These are join tables - CASCADE is actually fine here
-- If group is deleted, assignments should be deleted
-- No change needed

-- ==========================================
-- Timesheets Table
-- ==========================================

-- Tenant FK
ALTER TABLE public.timesheets
  DROP CONSTRAINT IF EXISTS timesheets_tenant_id_fkey;

ALTER TABLE public.timesheets
  ADD CONSTRAINT timesheets_tenant_id_fkey
    FOREIGN KEY (tenant_id)
    REFERENCES public.tenants(id)
    ON DELETE RESTRICT;

-- Employee FK
ALTER TABLE public.timesheets
  DROP CONSTRAINT IF EXISTS timesheets_employee_id_fkey;

ALTER TABLE public.timesheets
  ADD CONSTRAINT timesheets_employee_id_fkey
    FOREIGN KEY (employee_id)
    REFERENCES public.employees(id)
    ON DELETE RESTRICT; -- Changed from CASCADE

COMMENT ON CONSTRAINT timesheets_employee_id_fkey ON public.timesheets
  IS 'Employee FK - RESTRICT: Use softDeleteEmployeeCascade() to delete employee and timesheets';

-- ==========================================
-- Timesheet Entries Table
-- ==========================================

-- Tenant FK
ALTER TABLE public.timesheet_entries
  DROP CONSTRAINT IF EXISTS timesheet_entries_tenant_id_fkey;

ALTER TABLE public.timesheet_entries
  ADD CONSTRAINT timesheet_entries_tenant_id_fkey
    FOREIGN KEY (tenant_id)
    REFERENCES public.tenants(id)
    ON DELETE RESTRICT;

-- Timesheet FK - keep CASCADE
-- If timesheet is soft deleted, entries should be soft deleted too
-- This CASCADE is acceptable because it's a strong parent-child relationship
-- However, we're using manual cascade in code, so can change to RESTRICT

ALTER TABLE public.timesheet_entries
  DROP CONSTRAINT IF EXISTS timesheet_entries_timesheet_id_fkey;

ALTER TABLE public.timesheet_entries
  ADD CONSTRAINT timesheet_entries_timesheet_id_fkey
    FOREIGN KEY (timesheet_id)
    REFERENCES public.timesheets(id)
    ON DELETE RESTRICT; -- Changed from CASCADE

COMMENT ON CONSTRAINT timesheet_entries_timesheet_id_fkey ON public.timesheet_entries
  IS 'Timesheet FK - RESTRICT: Cascade soft delete handled in application code';

-- ==========================================
-- Vessels Table (if exists)
-- ==========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vessels') THEN
    ALTER TABLE public.vessels
      DROP CONSTRAINT IF EXISTS vessels_tenant_id_fkey;

    ALTER TABLE public.vessels
      ADD CONSTRAINT vessels_tenant_id_fkey
        FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id)
        ON DELETE RESTRICT;
  END IF;
END $$;

-- ==========================================
-- Approvals Table
-- ==========================================
-- Approvals are historical records - should probably keep CASCADE
-- If timesheet is deleted, approvals should be deleted too
-- NO CHANGE - keep CASCADE

-- ==========================================
-- Comments/Annotations Tables
-- ==========================================
-- These are also historical - consider keeping CASCADE
-- Or add soft delete if these need to be preserved
-- NO CHANGE - keep CASCADE

-- ==========================================
-- Verification Query
-- ==========================================
-- Run this to see all foreign key constraints and their delete behavior

CREATE OR REPLACE FUNCTION verify_cascade_constraints()
RETURNS TABLE (
  table_name TEXT,
  constraint_name TEXT,
  foreign_table TEXT,
  delete_rule TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.table_name::TEXT,
    tc.constraint_name::TEXT,
    ccu.table_name::TEXT AS foreign_table,
    rc.delete_rule::TEXT
  FROM information_schema.table_constraints tc
  JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON rc.unique_constraint_name = ccu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
  ORDER BY tc.table_name, tc.constraint_name;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Success Message
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Soft Delete Migration - Phase 5 Complete';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'CASCADE constraints removed from:';
  RAISE NOTICE '  - environments -> tenants';
  RAISE NOTICE '  - employees -> tenants';
  RAISE NOTICE '  - employees -> vessels (SET NULL)';
  RAISE NOTICE '  - timesheets -> tenants';
  RAISE NOTICE '  - timesheets -> employees';
  RAISE NOTICE '  - timesheet_entries -> tenants';
  RAISE NOTICE '  - timesheet_entries -> timesheets';
  RAISE NOTICE '  - vessels -> tenants (if exists)';
  RAISE NOTICE '';
  RAISE NOTICE 'All deletes now require explicit soft delete:';
  RAISE NOTICE '  - Use softDelete() for single records';
  RAISE NOTICE '  - Use softDeleteEmployeeCascade() for employees';
  RAISE NOTICE '  - Use softDeleteBatch() for multiple records';
  RAISE NOTICE '';
  RAISE NOTICE 'Verify constraints with:';
  RAISE NOTICE '  SELECT * FROM verify_cascade_constraints();';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Hard deletes will now fail if child records exist!';
  RAISE NOTICE 'This is intentional - prevents accidental data loss';
  RAISE NOTICE '==============================================';
END $$;

COMMIT;

-- ==========================================
-- Run Verification
-- ==========================================
-- Uncomment to see all FK constraints and their delete rules
-- SELECT * FROM verify_cascade_constraints();
