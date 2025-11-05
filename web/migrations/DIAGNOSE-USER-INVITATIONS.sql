-- ========================================
-- DIAGNOSTIC SCRIPT FOR user_invitations
-- ========================================
-- Run this to check the current state of the table

-- 1. Check if table exists
SELECT 
  'TABLE EXISTS' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_invitations'
    ) THEN '✅ YES'
    ELSE '❌ NO'
  END as result;

-- 2. Check all columns
SELECT 
  'COLUMNS' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_invitations'
ORDER BY ordinal_position;

-- 3. Check indexes
SELECT 
  'INDEXES' as check_type,
  indexname as index_name,
  indexdef as definition
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'user_invitations';

-- 4. Check constraints
SELECT 
  'CONSTRAINTS' as check_type,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
AND table_name = 'user_invitations';

-- 5. Check RLS status
SELECT 
  'RLS STATUS' as check_type,
  CASE 
    WHEN relrowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as result
FROM pg_class
WHERE relname = 'user_invitations' 
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 6. Check RLS policies
SELECT 
  'RLS POLICIES' as check_type,
  policyname as policy_name,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'user_invitations';

-- 7. Check triggers
SELECT 
  'TRIGGERS' as check_type,
  trigger_name,
  event_manipulation as event,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
AND event_object_table = 'user_invitations';

-- 8. Check functions related to user_invitations
SELECT 
  'FUNCTIONS' as check_type,
  routine_name as function_name,
  routine_type as type
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND (
  routine_name LIKE '%user_invitations%' 
  OR routine_name LIKE '%invitation%'
);

-- 9. Count existing invitations
SELECT 
  'DATA COUNT' as check_type,
  COUNT(*) as total_invitations,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
  COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
FROM public.user_invitations;

-- 10. Check for any data issues
SELECT 
  'DATA VALIDATION' as check_type,
  id,
  email,
  status,
  invited_at,
  expires_at,
  CASE 
    WHEN invited_by IS NULL THEN '❌ Missing invited_by'
    WHEN token IS NULL THEN '❌ Missing token'
    WHEN email IS NULL THEN '❌ Missing email'
    ELSE '✅ OK'
  END as validation_result
FROM public.user_invitations
WHERE invited_by IS NULL OR token IS NULL OR email IS NULL
LIMIT 10;

