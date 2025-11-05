-- ============================================================================
-- SYNC AUTH.USERS TO PROFILES - AUTOMATIC TRIGGER
-- ============================================================================
-- This script creates a database trigger that automatically syncs new users
-- from auth.users to the profiles table
--
-- Purpose: Ensure all authenticated users have a profile record
-- Scope: UNIVERSAL - Works for all clients (ABZ and future clients)
-- Date: 2025-11-05
-- Status: READY TO EXECUTE
-- ============================================================================

BEGIN;

-- Step 1: Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles table when a new user is created in auth.users
  INSERT INTO public.profiles (
    user_id,
    display_name,
    email,
    phone,
    ativo,
    locale,
    created_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'display_name')::TEXT,
      (NEW.raw_user_meta_data->>'name')::TEXT,
      NULLIF(TRIM(COALESCE((NEW.raw_user_meta_data->>'first_name')::TEXT, '') || ' ' || COALESCE((NEW.raw_user_meta_data->>'last_name')::TEXT, '')), ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    (NEW.raw_user_meta_data->>'phone')::TEXT,
    true, -- ativo = true by default
    COALESCE((NEW.raw_user_meta_data->>'locale')::TEXT, 'pt-BR'),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  RETURN NEW;
END;
$$;

-- Step 2: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Verify the trigger was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE '✅ Trigger "on_auth_user_created" created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create trigger';
  END IF;
END $$;

-- Step 5: Backfill existing users (one-time sync)
-- This ensures all existing auth.users have profiles
INSERT INTO public.profiles (
  user_id,
  display_name,
  email,
  phone,
  ativo,
  locale,
  created_at
)
SELECT
  au.id,
  COALESCE(
    (au.raw_user_meta_data->>'display_name')::TEXT,
    (au.raw_user_meta_data->>'name')::TEXT,
    NULLIF(TRIM(COALESCE((au.raw_user_meta_data->>'first_name')::TEXT, '') || ' ' || COALESCE((au.raw_user_meta_data->>'last_name')::TEXT, '')), ''),
    split_part(au.email, '@', 1)
  ),
  au.email,
  (au.raw_user_meta_data->>'phone')::TEXT,
  true,
  COALESCE((au.raw_user_meta_data->>'locale')::TEXT, 'pt-BR'),
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = au.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 6: Report results
DO $$
DECLARE
  auth_users_count INT;
  profiles_count INT;
  synced_count INT;
BEGIN
  SELECT COUNT(*) INTO auth_users_count FROM auth.users;
  SELECT COUNT(*) INTO profiles_count FROM public.profiles;
  synced_count := profiles_count;

  RAISE NOTICE '';
  RAISE NOTICE '=== ✅ SYNC TRIGGER INSTALLED ===';
  RAISE NOTICE 'Trigger: on_auth_user_created';
  RAISE NOTICE 'Function: handle_new_user()';
  RAISE NOTICE '';
  RAISE NOTICE '=== SYNC STATUS ===';
  RAISE NOTICE 'auth.users count: %', auth_users_count;
  RAISE NOTICE 'profiles count: %', profiles_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ All future users will be automatically synced to profiles!';
  RAISE NOTICE '';
END $$;

COMMIT;

-- Final verification query
SELECT 
  '✅ VERIFICATION' as status,
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

