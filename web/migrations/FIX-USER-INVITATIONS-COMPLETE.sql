-- ============================================================================
-- FIX USER INVITATIONS - COMPLETE CLEANUP AND RECREATION
-- ============================================================================
-- This script safely removes any partial migration and recreates everything
-- Execute this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Drop existing objects (if they exist)
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS user_invitations_updated_at ON public.user_invitations;

-- Drop functions
DROP FUNCTION IF EXISTS update_user_invitations_updated_at();
DROP FUNCTION IF EXISTS expire_old_invitations();

-- Drop policies
DROP POLICY IF EXISTS user_invitations_admin_all ON public.user_invitations;

-- Drop indexes
DROP INDEX IF EXISTS idx_user_invitations_email;
DROP INDEX IF EXISTS idx_user_invitations_token;
DROP INDEX IF EXISTS idx_user_invitations_status;
DROP INDEX IF EXISTS idx_user_invitations_invited_by;

-- Drop table (this will cascade delete everything)
DROP TABLE IF EXISTS public.user_invitations CASCADE;

-- ============================================================================
-- Step 2: Create everything fresh
-- ============================================================================

-- Create user_invitations table
CREATE TABLE public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  position TEXT,
  department TEXT,
  role TEXT NOT NULL CHECK (role IN ('USER', 'MANAGER_TIMESHEET', 'MANAGER', 'ADMIN')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  accepted_at TIMESTAMPTZ,
  tenant_ids UUID[] DEFAULT '{}',
  group_ids UUID[] DEFAULT '{}',
  managed_group_ids UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX idx_user_invitations_invited_by ON public.user_invitations(invited_by);

-- Enable RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Admins can see all invitations
CREATE POLICY user_invitations_admin_all ON public.user_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users_unified
      WHERE users_unified.id = auth.uid()
      AND users_unified.role = 'ADMIN'
    )
  );

-- Trigger function to update updated_at
CREATE FUNCTION update_user_invitations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_invitations_updated_at
  BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_invitations_updated_at();

-- Function to expire old invitations
CREATE FUNCTION expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_invitations
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$;

-- Comments
COMMENT ON TABLE public.user_invitations IS 'Stores user invitation tokens and pre-configured permissions';
COMMENT ON COLUMN public.user_invitations.token IS 'Unique token for invitation link (UUID v4)';
COMMENT ON COLUMN public.user_invitations.tenant_ids IS 'Array of tenant IDs the user will belong to';
COMMENT ON COLUMN public.user_invitations.group_ids IS 'Array of group IDs the user will belong to';
COMMENT ON COLUMN public.user_invitations.managed_group_ids IS 'Array of group IDs the manager will manage (only for MANAGER roles)';

-- ============================================================================
-- Step 3: Verify creation
-- ============================================================================

-- This should return 1 row
SELECT 
  'user_invitations table created successfully' as status,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_invitations';

-- This should return 4 rows (indexes)
SELECT 
  'Indexes created' as status,
  indexname 
FROM pg_indexes 
WHERE tablename = 'user_invitations';

-- This should return 1 row (policy)
SELECT 
  'RLS Policy created' as status,
  policyname 
FROM pg_policies 
WHERE tablename = 'user_invitations';

-- ============================================================================
-- ✅ DONE! The user_invitations system is now ready to use.
-- ============================================================================

