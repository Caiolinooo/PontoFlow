-- ============================================================================
-- FIX USER INVITATIONS FOREIGN KEY - CHANGE TO PROFILES
-- ============================================================================
-- This script changes the foreign key constraint from users_unified to profiles
-- 
-- Problem: invited_by references users_unified(id), but not all users exist there
-- Solution: Change FK to reference profiles(user_id) which is synced with auth.users
--
-- Date: 2025-11-05
-- Status: READY TO EXECUTE
-- ============================================================================

BEGIN;

-- Step 1: Drop the existing foreign key constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_invitations_invited_by_fkey' 
    AND conrelid = 'user_invitations'::regclass
  ) THEN
    ALTER TABLE public.user_invitations 
    DROP CONSTRAINT user_invitations_invited_by_fkey;
    RAISE NOTICE '✅ Dropped old foreign key constraint: user_invitations_invited_by_fkey';
  ELSE
    RAISE NOTICE '⚠️  Foreign key constraint user_invitations_invited_by_fkey does not exist';
  END IF;
END $$;

-- Step 2: Add new foreign key constraint referencing profiles(user_id)
ALTER TABLE public.user_invitations
ADD CONSTRAINT user_invitations_invited_by_fkey 
FOREIGN KEY (invited_by) 
REFERENCES profiles(user_id) 
ON DELETE CASCADE;

-- Step 3: Verify the new constraint
DO $$
DECLARE
  constraint_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint 
  WHERE conname = 'user_invitations_invited_by_fkey' 
  AND conrelid = 'user_invitations'::regclass;
  
  IF constraint_def IS NOT NULL THEN
    RAISE NOTICE '✅ New foreign key constraint created successfully';
    RAISE NOTICE 'Definition: %', constraint_def;
  ELSE
    RAISE EXCEPTION '❌ Failed to create foreign key constraint';
  END IF;
END $$;

-- Step 4: Verify constraint details
SELECT 
  '✅ VERIFICATION' as status,
  conname as constraint_name,
  confrelid::regclass as referenced_table,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_invitations'::regclass 
  AND contype = 'f'
  AND conname = 'user_invitations_invited_by_fkey';

COMMIT;

-- Final message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== ✅ MIGRATION COMPLETE ===';
  RAISE NOTICE 'Foreign key constraint updated successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'OLD: invited_by → users_unified(id)';
  RAISE NOTICE 'NEW: invited_by → profiles(user_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now create invitations with any user that exists in profiles table.';
  RAISE NOTICE 'This includes all users authenticated via Supabase Auth.';
  RAISE NOTICE '';
END $$;

