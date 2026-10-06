-- ============================================================================
-- SYNC PROFILES TO USERS_UNIFIED - CONFIGURABLE TRIGGER (ABZ ONLY)
-- ============================================================================
-- This script creates a database trigger that automatically syncs profiles
-- to users_unified table for ABZ Group's Painel ABZ integration
--
-- Purpose: Maintain users_unified for legacy Painel ABZ integration
-- Scope: ABZ GROUP ONLY - Can be disabled for future clients
-- Date: 2025-11-05
-- Status: READY TO EXECUTE
-- ============================================================================
--
-- IMPORTANT: This trigger is OPTIONAL and specific to ABZ Group.
-- Future clients should NOT run this script.
--
-- To DISABLE this sync for future clients:
-- 1. Do not run this migration script
-- 2. Or run: DROP TRIGGER IF EXISTS on_profile_sync_to_users_unified ON profiles;
-- ============================================================================

BEGIN;

-- Step 1: Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.sync_profile_to_users_unified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_metadata JSONB;
  user_role TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
  user_phone TEXT;
  user_position TEXT;
  user_department TEXT;
BEGIN
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
    true, -- Assume verified if they have a profile
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
END;
$$;

-- Step 2: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_profile_sync_to_users_unified ON public.profiles;

-- Step 3: Create the trigger
CREATE TRIGGER on_profile_sync_to_users_unified
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_users_unified();

-- Step 4: Verify the trigger was created
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

-- Step 5: Backfill existing profiles to users_unified (one-time sync)
-- This ensures all existing profiles are synced to users_unified
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
SELECT 
  p.user_id,
  p.email,
  COALESCE(
    au.raw_user_meta_data->>'first_name',
    split_part(p.display_name, ' ', 1)
  ),
  COALESCE(
    au.raw_user_meta_data->>'last_name',
    split_part(p.display_name, ' ', 2)
  ),
  COALESCE(p.phone, au.raw_user_meta_data->>'phone_number'),
  au.raw_user_meta_data->>'position',
  au.raw_user_meta_data->>'department',
  COALESCE(au.raw_user_meta_data->>'role', 'USER'),
  p.ativo,
  true,
  0,
  p.created_at,
  NOW()
FROM public.profiles p
JOIN auth.users au ON au.id = p.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.users_unified u WHERE u.id = p.user_id
)
ON CONFLICT (id) DO NOTHING;

-- Step 6: Report results
DO $$
DECLARE
  profiles_count INT;
  users_unified_count INT;
BEGIN
  SELECT COUNT(*) INTO profiles_count FROM public.profiles;
  SELECT COUNT(*) INTO users_unified_count FROM public.users_unified;

  RAISE NOTICE '';
  RAISE NOTICE '=== ✅ ABZ SYNC TRIGGER INSTALLED ===';
  RAISE NOTICE 'Trigger: on_profile_sync_to_users_unified';
  RAISE NOTICE 'Function: sync_profile_to_users_unified()';
  RAISE NOTICE 'Scope: ABZ GROUP ONLY (Painel ABZ integration)';
  RAISE NOTICE '';
  RAISE NOTICE '=== SYNC STATUS ===';
  RAISE NOTICE 'profiles count: %', profiles_count;
  RAISE NOTICE 'users_unified count: %', users_unified_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ All future profiles will be automatically synced to users_unified!';
  RAISE NOTICE '⚠️  For future clients: DO NOT run this migration';
  RAISE NOTICE '';
END $$;

COMMIT;

