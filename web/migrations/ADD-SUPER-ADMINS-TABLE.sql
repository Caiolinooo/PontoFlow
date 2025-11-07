-- ==========================================
-- Migration: Add Super Admins Table
-- ==========================================
-- Purpose: Enable multi-level super admin management for SaaS model
-- Author: System
-- Date: 2025-11-07
-- ==========================================

-- ==========================================
-- Table: super_admins
-- ==========================================
-- Super admins can manage all tenants and have global system access
-- Note: System owner (Caio) is hardcoded in application code as permanent super admin
CREATE TABLE IF NOT EXISTS public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  notes TEXT,

  CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Enable RLS
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.super_admins IS 'Super admins with global system access across all tenants';
COMMENT ON COLUMN public.super_admins.id IS 'Unique super admin identifier';
COMMENT ON COLUMN public.super_admins.email IS 'Super admin email address (unique)';
COMMENT ON COLUMN public.super_admins.created_at IS 'Timestamp when super admin was added';
COMMENT ON COLUMN public.super_admins.created_by IS 'Email of the super admin who added this entry';
COMMENT ON COLUMN public.super_admins.notes IS 'Optional notes about this super admin';

-- ==========================================
-- RLS Policies
-- ==========================================
-- IMPORTANT: Only super admins can view/manage this table
-- Regular admins, managers, and users CANNOT see this table exists

-- Policy: Super admins can view all entries
-- Note: This is checked in application code - RLS is additional layer
CREATE POLICY "super_admins_select" ON public.super_admins
  FOR SELECT
  USING (
    -- Allow if user is in super_admins table OR is system owner (checked in app)
    EXISTS (
      SELECT 1 FROM public.super_admins sa
      WHERE sa.email = current_user_email()
    )
  );

-- Policy: Super admins can insert new super admins
CREATE POLICY "super_admins_insert" ON public.super_admins
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.super_admins sa
      WHERE sa.email = current_user_email()
    )
  );

-- Policy: Super admins can delete other super admins (but not themselves)
CREATE POLICY "super_admins_delete" ON public.super_admins
  FOR DELETE
  USING (
    email != current_user_email()
    AND EXISTS (
      SELECT 1 FROM public.super_admins sa
      WHERE sa.email = current_user_email()
    )
  );

-- ==========================================
-- Helper Function
-- ==========================================
-- Get current authenticated user's email
-- This is used by RLS policies
CREATE OR REPLACE FUNCTION current_user_email()
RETURNS TEXT AS $$
BEGIN
  -- This will be set by application code via request context
  -- For now, return empty string (app handles actual checks)
  RETURN COALESCE(current_setting('request.jwt.claims', true)::json->>'email', '');
EXCEPTION
  WHEN OTHERS THEN
    RETURN '';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION current_user_email() IS 'Returns email of currently authenticated user from JWT claims';

-- ==========================================
-- Indexes
-- ==========================================
-- Index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_super_admins_email ON public.super_admins(email);

-- ==========================================
-- Audit Trigger
-- ==========================================
-- Log all changes to super_admins table
CREATE TABLE IF NOT EXISTS public.super_admins_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'DELETE')),
  super_admin_email TEXT NOT NULL,
  performed_by TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

COMMENT ON TABLE public.super_admins_audit IS 'Audit log for super admin changes';

-- Trigger function
CREATE OR REPLACE FUNCTION audit_super_admins()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.super_admins_audit (action, super_admin_email, performed_by, notes)
    VALUES ('INSERT', NEW.email, NEW.created_by, NEW.notes);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.super_admins_audit (action, super_admin_email, performed_by)
    VALUES ('DELETE', OLD.email, current_user_email());
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_audit_super_admins ON public.super_admins;
CREATE TRIGGER trigger_audit_super_admins
  AFTER INSERT OR DELETE ON public.super_admins
  FOR EACH ROW EXECUTE FUNCTION audit_super_admins();

-- ==========================================
-- Grants
-- ==========================================
-- Service role has full access (used by application)
GRANT ALL ON public.super_admins TO service_role;
GRANT ALL ON public.super_admins_audit TO service_role;

-- Authenticated users have NO direct access (controlled via RLS)
REVOKE ALL ON public.super_admins FROM authenticated;
GRANT SELECT ON public.super_admins TO authenticated;

-- ==========================================
-- Success Message
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE 'Super admins table created successfully';
  RAISE NOTICE 'Note: System owner is hardcoded in application code';
  RAISE NOTICE 'Use admin panel to add additional super admins';
END $$;
