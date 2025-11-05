-- ============================================================================
-- DIAGNOSE USER INVITATIONS FOREIGN KEY ISSUE
-- ============================================================================
-- This script helps diagnose why user_invitations.invited_by foreign key fails
-- 
-- Problem: invited_by references users_unified(id), but the current user's ID
--          doesn't exist in users_unified table
--
-- Date: 2025-11-05
-- ============================================================================

-- Step 1: Check the current user ID that's failing
-- Replace 'e7edafc8-f993-400b-ada9-4eeea17ee9cc' with your actual user ID
DO $$
DECLARE
  problem_user_id UUID := 'e7edafc8-f993-400b-ada9-4eeea17ee9cc';
BEGIN
  RAISE NOTICE '=== DIAGNOSTIC REPORT ===';
  RAISE NOTICE 'Checking user ID: %', problem_user_id;
  RAISE NOTICE '';
END $$;

-- Step 2: Check if user exists in auth.users (Supabase Auth)
SELECT 
  '1. AUTH.USERS CHECK' as step,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = 'e7edafc8-f993-400b-ada9-4eeea17ee9cc') 
    THEN '✅ User EXISTS in auth.users'
    ELSE '❌ User NOT FOUND in auth.users'
  END as result;

-- Step 3: Check if user exists in profiles
SELECT 
  '2. PROFILES CHECK' as step,
  CASE 
    WHEN EXISTS (SELECT 1 FROM profiles WHERE user_id = 'e7edafc8-f993-400b-ada9-4eeea17ee9cc') 
    THEN '✅ User EXISTS in profiles'
    ELSE '❌ User NOT FOUND in profiles'
  END as result;

-- Step 4: Check if user exists in users_unified
SELECT 
  '3. USERS_UNIFIED CHECK' as step,
  CASE 
    WHEN EXISTS (SELECT 1 FROM users_unified WHERE id = 'e7edafc8-f993-400b-ada9-4eeea17ee9cc') 
    THEN '✅ User EXISTS in users_unified'
    ELSE '❌ User NOT FOUND in users_unified (THIS IS THE PROBLEM!)'
  END as result;

-- Step 5: Show user details from auth.users
SELECT 
  '4. USER DETAILS (auth.users)' as step,
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE id = 'e7edafc8-f993-400b-ada9-4eeea17ee9cc';

-- Step 6: Show user details from profiles
SELECT 
  '5. USER DETAILS (profiles)' as step,
  user_id,
  display_name,
  first_name,
  last_name,
  email,
  tenant_id,
  created_at
FROM profiles 
WHERE user_id = 'e7edafc8-f993-400b-ada9-4eeea17ee9cc';

-- Step 7: Check current foreign key constraint
SELECT 
  '6. FOREIGN KEY CONSTRAINT' as step,
  conname as constraint_name,
  confrelid::regclass as referenced_table,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_invitations'::regclass 
  AND contype = 'f'
  AND conname = 'user_invitations_invited_by_fkey';

-- Step 8: Count records in each table
SELECT 
  '7. TABLE RECORD COUNTS' as step,
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM profiles) as profiles_count,
  (SELECT COUNT(*) FROM users_unified) as users_unified_count;

-- Step 9: Show all users in users_unified (to see who's there)
SELECT 
  '8. USERS IN users_unified' as step,
  id,
  email,
  first_name,
  last_name,
  role,
  active,
  created_at
FROM users_unified
ORDER BY created_at DESC
LIMIT 10;

-- Step 10: Recommendation
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== RECOMMENDATION ===';
  RAISE NOTICE 'The foreign key constraint references users_unified(id), but your user only exists in auth.users and profiles.';
  RAISE NOTICE '';
  RAISE NOTICE 'SOLUTION OPTIONS:';
  RAISE NOTICE '1. Change FK to reference profiles(user_id) instead of users_unified(id)';
  RAISE NOTICE '2. Sync your user from auth.users to users_unified';
  RAISE NOTICE '';
  RAISE NOTICE 'RECOMMENDED: Option 1 (Change FK to profiles)';
  RAISE NOTICE 'This makes the system work for all users, not just those in users_unified.';
  RAISE NOTICE '';
  RAISE NOTICE 'Run: FIX-USER-INVITATIONS-FK-TO-PROFILES.sql';
END $$;

