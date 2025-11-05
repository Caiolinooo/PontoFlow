-- ============================================================================
-- SYNC PROFILES TO USERS_UNIFIED - CONFIGURABLE TRIGGER
-- ============================================================================
-- This script creates a configurable database trigger that syncs profiles
-- to users_unified table based on a configuration setting
--
-- Purpose: Maintain users_unified for legacy Painel ABZ integration
-- Scope: CONFIGURABLE - Can be enabled/disabled via database setting
-- Date: 2025-11-05
-- Status: READY TO EXECUTE
-- ============================================================================
--
-- CONFIGURATION:
-- The trigger checks a configuration table to determine if sync is enabled.
-- This allows enabling/disabling sync without modifying triggers.
--
-- To ENABLE sync:  UPDATE system_config SET value = 'true' WHERE key = 'enable_users_unified_sync';
-- To DISABLE sync: UPDATE system_config SET value = 'false' WHERE key = 'enable_users_unified_sync';
-- ============================================================================

BEGIN;

-- Step 1: Create system_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Insert default configuration (enabled for ABZ Group)
INSERT INTO public.system_config (key, value, description)
VALUES (
  'enable_users_unified_sync',
  'true',
  'Enable automatic sync from profiles to users_unified (ABZ Group only)'
)
ON CONFLICT (key) DO NOTHING;

-- Step 3: Create or replace the configurable trigger function
CREATE OR REPLACE FUNCTION public.sync_profile_to_users_unified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sync_enabled TEXT;
  user_metadata JSONB;
  user_role TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
  user_phone TEXT;
  user_position TEXT;
  user_department TEXT;
BEGIN
  -- Check if sync is enabled
  SELECT value INTO sync_enabled
  FROM public.system_config
  WHERE key = 'enable_users_unified_sync';

  -- If sync is disabled, skip
  IF sync_enabled IS NULL OR sync_enabled != 'true' THEN
    RETURN NEW;
  END IF;

  -- Check if users_unified table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'users_unified'
  ) THEN
    -- Table doesn't exist, skip sync
    RETURN NEW;
  END IF;

  -- Get additional user data from auth.users metadata
  SELECT raw_user_meta_data INTO user_metadata
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Extract fields from metadata (with explicit type casting)
  user_role := COALESCE((user_metadata->>'role')::TEXT, 'USER');
  user_first_name := COALESCE((user_metadata->>'first_name')::TEXT, split_part(NEW.display_name, ' ', 1));
  user_last_name := COALESCE((user_metadata->>'last_name')::TEXT, split_part(NEW.display_name, ' ', 2));
  user_phone := COALESCE(NEW.phone, (user_metadata->>'phone_number')::TEXT);
  user_position := (user_metadata->>'position')::TEXT;
  user_department := (user_metadata->>'department')::TEXT;

  -- Upsert into users_unified
  INSERT INTO public.users_unified (
    id,
    email,
    first_name,
    last_name,
    phone_number,
    position,
    department,
    role,
    active,
    email_verified,
    failed_login_attempts,
    created_at,
    updated_at
  )
  VALUES (
    NEW.user_id,
    NEW.email,
    user_first_name,
    user_last_name,
    user_phone,
    user_position,
    user_department,
    user_role,
    NEW.ativo,
    true,
    0,
    NEW.created_at,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, users_unified.first_name),
    last_name = COALESCE(EXCLUDED.last_name, users_unified.last_name),
    phone_number = COALESCE(EXCLUDED.phone_number, users_unified.phone_number),
    position = COALESCE(EXCLUDED.position, users_unified.position),
    department = COALESCE(EXCLUDED.department, users_unified.department),
    active = EXCLUDED.active,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs (e.g., table doesn't exist), just skip sync
    RETURN NEW;
END;
$$;

-- Step 4: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_profile_sync_to_users_unified ON public.profiles;

-- Step 5: Create the trigger
CREATE TRIGGER on_profile_sync_to_users_unified
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_users_unified();

-- Step 6: Create function to enable/disable sync
CREATE OR REPLACE FUNCTION public.set_users_unified_sync(enabled BOOLEAN)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.system_config
  SET value = CASE WHEN enabled THEN 'true' ELSE 'false' END,
      updated_at = NOW()
  WHERE key = 'enable_users_unified_sync';

  IF enabled THEN
    RETURN '✅ users_unified sync ENABLED';
  ELSE
    RETURN '❌ users_unified sync DISABLED';
  END IF;
END;
$$;

-- Step 7: Verify the trigger was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_profile_sync_to_users_unified'
  ) THEN
    RAISE NOTICE '✅ Trigger "on_profile_sync_to_users_unified" created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create trigger';
  END IF;
END $$;

COMMIT;

-- Step 8: Report configuration
DO $$
DECLARE
  sync_status TEXT;
BEGIN
  SELECT value INTO sync_status
  FROM public.system_config
  WHERE key = 'enable_users_unified_sync';

  RAISE NOTICE '';
  RAISE NOTICE '=== ✅ CONFIGURABLE SYNC TRIGGER INSTALLED ===';
  RAISE NOTICE 'Trigger: on_profile_sync_to_users_unified';
  RAISE NOTICE 'Function: sync_profile_to_users_unified()';
  RAISE NOTICE 'Configuration: system_config table';
  RAISE NOTICE '';
  RAISE NOTICE '=== CURRENT STATUS ===';
  RAISE NOTICE 'Sync enabled: %', sync_status;
  RAISE NOTICE '';
  RAISE NOTICE '=== HOW TO CONTROL ===';
  RAISE NOTICE 'Enable:  SELECT public.set_users_unified_sync(true);';
  RAISE NOTICE 'Disable: SELECT public.set_users_unified_sync(false);';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Sync is now configurable via database setting!';
  RAISE NOTICE '';
END $$;

