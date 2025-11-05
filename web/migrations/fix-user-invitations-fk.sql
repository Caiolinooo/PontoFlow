-- Migration: Fix user_invitations foreign key constraint
-- Date: 2025-01-04
-- Issue: Foreign key violation when users exist in profiles but not in users_unified
-- Solution: Change FK reference from users_unified to profiles

-- Description:
-- The user_invitations.invited_by column had a foreign key constraint referencing
-- users_unified(id), but not all authenticated users exist in users_unified.
-- This migration changes the FK to reference profiles(user_id) instead, which is
-- the universal table that syncs with auth.users.

-- Step 1: Drop the old foreign key constraint
ALTER TABLE user_invitations 
DROP CONSTRAINT IF EXISTS user_invitations_invited_by_fkey;

-- Step 2: Add new foreign key constraint referencing profiles
ALTER TABLE user_invitations 
ADD CONSTRAINT user_invitations_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Verification query (run after migration):
-- SELECT conname, confrelid::regclass AS referenced_table, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'user_invitations'::regclass AND contype = 'f';

-- Expected result:
-- conname: user_invitations_invited_by_fkey
-- referenced_table: profiles
-- constraint_definition: FOREIGN KEY (invited_by) REFERENCES profiles(user_id) ON DELETE CASCADE

