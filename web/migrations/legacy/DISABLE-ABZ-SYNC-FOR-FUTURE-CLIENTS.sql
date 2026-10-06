-- ============================================================================
-- DISABLE ABZ SYNC FOR FUTURE CLIENTS
-- ============================================================================
-- This script disables the ABZ-specific sync from profiles to users_unified
-- 
-- Purpose: Prepare the system for future clients who don't need users_unified
-- Scope: FUTURE CLIENTS ONLY - DO NOT RUN FOR ABZ GROUP
-- Date: 2025-11-05
-- Status: READY TO EXECUTE (ONLY FOR FUTURE CLIENTS)
-- ============================================================================
--
-- ⚠️  WARNING: DO NOT RUN THIS SCRIPT FOR ABZ GROUP!
-- This will break the Painel ABZ integration.
--
-- Only run this script when setting up a new client instance that:
-- 1. Does NOT need Painel ABZ integration
-- 2. Does NOT need users_unified table
-- 3. Will use only auth.users and profiles
-- ============================================================================

BEGIN;

-- Step 1: Disable the trigger
DROP TRIGGER IF EXISTS on_profile_sync_to_users_unified ON public.profiles;

-- Step 2: Drop the trigger function
DROP FUNCTION IF EXISTS public.sync_profile_to_users_unified();

-- Step 3: Verify triggers are removed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_profile_sync_to_users_unified'
  ) THEN
    RAISE NOTICE '✅ Trigger "on_profile_sync_to_users_unified" removed successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to remove trigger';
  END IF;
END $$;

-- Step 4: Report results
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== ✅ ABZ SYNC DISABLED ===';
  RAISE NOTICE 'Trigger: on_profile_sync_to_users_unified [REMOVED]';
  RAISE NOTICE 'Function: sync_profile_to_users_unified() [REMOVED]';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  users_unified table still exists but is no longer synced';
  RAISE NOTICE '⚠️  To completely remove users_unified, run:';
  RAISE NOTICE '    DROP TABLE IF EXISTS public.users_unified CASCADE;';
  RAISE NOTICE '';
  RAISE NOTICE '✅ System is now ready for future clients!';
  RAISE NOTICE '✅ Only auth.users and profiles will be used.';
  RAISE NOTICE '';
END $$;

COMMIT;

-- Optional: Uncomment the following to completely remove users_unified table
-- ⚠️  WARNING: This will delete all data in users_unified and break any
--     foreign keys referencing it. Only do this if you're sure!
--
-- BEGIN;
-- DROP TABLE IF EXISTS public.users_unified CASCADE;
-- RAISE NOTICE '✅ users_unified table removed completely';
-- COMMIT;

