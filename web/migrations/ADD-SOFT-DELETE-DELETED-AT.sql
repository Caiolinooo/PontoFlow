-- ==========================================
-- Migration: Add Soft Delete Support (deleted_at)
-- ==========================================
-- Purpose: Implement soft delete pattern for LGPD/GDPR compliance
-- Phase: 1 of 5 - Add deleted_at columns
-- Date: 2025-11-07
-- ==========================================

-- ==========================================
-- PHASE 1: Add deleted_at columns
-- ==========================================
-- This migration adds deleted_at timestamp to tables that should support soft delete
-- NULL = active (not deleted)
-- NOT NULL = soft deleted (timestamp of deletion)

BEGIN;

-- ==========================================
-- Core Tables
-- ==========================================

-- Tenants (clients/companies)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.tenants.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = deleted';

-- Profiles (user profiles)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.profiles.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = deleted';

-- Users Unified (legacy ABZ users)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users_unified') THEN
    ALTER TABLE public.users_unified
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

    COMMENT ON COLUMN public.users_unified.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = deleted';
  END IF;
END $$;

-- ==========================================
-- Configuration Tables
-- ==========================================

-- Environments (work environments)
ALTER TABLE public.environments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.environments.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = deleted';

-- Groups (employee groups)
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.groups.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = deleted';

-- Vessels (ships/boats)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vessels') THEN
    ALTER TABLE public.vessels
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

    COMMENT ON COLUMN public.vessels.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = deleted';
  END IF;
END $$;

-- ==========================================
-- Employee Tables
-- ==========================================

-- Employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.employees.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = deleted';

-- ==========================================
-- Timesheet Tables
-- ==========================================

-- Timesheets (main timesheet records)
ALTER TABLE public.timesheets
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.timesheets.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = deleted';

-- Timesheet Entries (individual entries)
ALTER TABLE public.timesheet_entries
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.timesheet_entries.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = deleted';

-- ==========================================
-- Indexes for Performance
-- ==========================================
-- Indexes on deleted_at for fast filtering of active records

CREATE INDEX IF NOT EXISTS idx_tenants_deleted_at ON public.tenants(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_environments_deleted_at ON public.environments(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_groups_deleted_at ON public.groups(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_deleted_at ON public.employees(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_timesheets_deleted_at ON public.timesheets(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_deleted_at ON public.timesheet_entries(deleted_at) WHERE deleted_at IS NULL;

-- Conditional indexes for tables that may not exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users_unified') THEN
    CREATE INDEX IF NOT EXISTS idx_users_unified_deleted_at ON public.users_unified(deleted_at) WHERE deleted_at IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vessels') THEN
    CREATE INDEX IF NOT EXISTS idx_vessels_deleted_at ON public.vessels(deleted_at) WHERE deleted_at IS NULL;
  END IF;
END $$;

-- ==========================================
-- Helper Function: Soft Delete
-- ==========================================
-- Generic function to soft delete records
CREATE OR REPLACE FUNCTION soft_delete(
  table_name TEXT,
  record_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  sql TEXT;
BEGIN
  -- Validate table name to prevent SQL injection
  IF table_name !~ '^[a-z_]+$' THEN
    RAISE EXCEPTION 'Invalid table name: %', table_name;
  END IF;

  -- Build and execute UPDATE statement
  sql := format('UPDATE public.%I SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', table_name);
  EXECUTE sql USING record_id;

  -- Return true if a row was updated
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION soft_delete(TEXT, UUID) IS 'Soft delete a record by setting deleted_at timestamp';

-- ==========================================
-- Helper Function: Restore Deleted
-- ==========================================
-- Generic function to restore soft deleted records
CREATE OR REPLACE FUNCTION restore_deleted(
  table_name TEXT,
  record_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  sql TEXT;
BEGIN
  -- Validate table name to prevent SQL injection
  IF table_name !~ '^[a-z_]+$' THEN
    RAISE EXCEPTION 'Invalid table name: %', table_name;
  END IF;

  -- Build and execute UPDATE statement
  sql := format('UPDATE public.%I SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL', table_name);
  EXECUTE sql USING record_id;

  -- Return true if a row was updated
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION restore_deleted(TEXT, UUID) IS 'Restore a soft deleted record by clearing deleted_at timestamp';

-- ==========================================
-- Helper Function: Hard Delete
-- ==========================================
-- Generic function to permanently delete soft deleted records
-- DANGEROUS: This permanently deletes data!
CREATE OR REPLACE FUNCTION hard_delete_soft_deleted(
  table_name TEXT,
  older_than_days INTEGER DEFAULT 90
) RETURNS INTEGER AS $$
DECLARE
  sql TEXT;
  deleted_count INTEGER;
BEGIN
  -- Validate table name to prevent SQL injection
  IF table_name !~ '^[a-z_]+$' THEN
    RAISE EXCEPTION 'Invalid table name: %', table_name;
  END IF;

  -- Validate older_than_days
  IF older_than_days < 30 THEN
    RAISE EXCEPTION 'older_than_days must be at least 30 days for safety';
  END IF;

  -- Build and execute DELETE statement
  sql := format(
    'DELETE FROM public.%I WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL ''%s days''',
    table_name,
    older_than_days
  );

  EXECUTE sql;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log the deletion
  RAISE NOTICE 'Hard deleted % records from % (older than % days)', deleted_count, table_name, older_than_days;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION hard_delete_soft_deleted(TEXT, INTEGER) IS 'Permanently delete soft deleted records older than specified days (default 90). DANGEROUS!';

-- ==========================================
-- View: Active Records Helper
-- ==========================================
-- Example view for active employees (non-deleted)
CREATE OR REPLACE VIEW active_employees AS
SELECT * FROM public.employees
WHERE deleted_at IS NULL;

COMMENT ON VIEW active_employees IS 'View of active (non-deleted) employees';

-- ==========================================
-- Success Message
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Soft Delete Migration - Phase 1 Complete';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Tables updated with deleted_at column:';
  RAISE NOTICE '  - tenants';
  RAISE NOTICE '  - profiles';
  RAISE NOTICE '  - users_unified (if exists)';
  RAISE NOTICE '  - environments';
  RAISE NOTICE '  - groups';
  RAISE NOTICE '  - vessels (if exists)';
  RAISE NOTICE '  - employees';
  RAISE NOTICE '  - timesheets';
  RAISE NOTICE '  - timesheet_entries';
  RAISE NOTICE '';
  RAISE NOTICE 'Indexes created for performance';
  RAISE NOTICE 'Helper functions created:';
  RAISE NOTICE '  - soft_delete(table_name, record_id)';
  RAISE NOTICE '  - restore_deleted(table_name, record_id)';
  RAISE NOTICE '  - hard_delete_soft_deleted(table_name, older_than_days)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  Phase 2: Update RLS policies to filter deleted records';
  RAISE NOTICE '  Phase 3: Update application queries';
  RAISE NOTICE '  Phase 4: Update API endpoints';
  RAISE NOTICE '  Phase 5: Remove CASCADE constraints (careful!)';
  RAISE NOTICE '==============================================';
END $$;

COMMIT;
