-- ==========================================
-- Database Setup Wizard - Layer 2: User & Environment Tables
-- ==========================================
-- Purpose: Create user profiles, authentication, and environment tables
-- Dependencies: Layer 1 (tenants)
-- Order: 3
-- Tables: profiles, users_unified, environments, vessels, password_reset_tokens
-- ==========================================

-- ==========================================
-- Table: profiles
-- ==========================================
-- User profiles (separate from auth.users for flexibility)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  locale TEXT NOT NULL DEFAULT 'pt-BR' CHECK (locale IN ('pt-BR', 'en-GB')),
  ui_theme TEXT CHECK (ui_theme IN ('light', 'dark')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.profiles IS 'User profiles - separate from auth.users';
COMMENT ON COLUMN public.profiles.user_id IS 'References auth.users(id)';
COMMENT ON COLUMN public.profiles.display_name IS 'User display name';
COMMENT ON COLUMN public.profiles.email IS 'User email (synced from auth.users)';
COMMENT ON COLUMN public.profiles.ativo IS 'User active status';
COMMENT ON COLUMN public.profiles.locale IS 'User preferred locale';

-- ==========================================
-- Table: users_unified
-- ==========================================
-- Unified user table for custom authentication (ABZ Group specific)
CREATE TABLE IF NOT EXISTS public.users_unified (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  position TEXT,
  department TEXT,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'MANAGER_TIMESHEET', 'MANAGER', 'ADMIN')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.users_unified ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.users_unified IS 'Unified user authentication table (ABZ Group)';
COMMENT ON COLUMN public.users_unified.password_hash IS 'Bcrypt password hash';
COMMENT ON COLUMN public.users_unified.role IS 'User role: USER, MANAGER_TIMESHEET, MANAGER, ADMIN';

-- ==========================================
-- Table: environments
-- ==========================================
-- Work environments/departments per tenant
CREATE TABLE IF NOT EXISTS public.environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

-- Enable RLS
ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.environments IS 'Work environments/departments per tenant';
COMMENT ON COLUMN public.environments.tenant_id IS 'Parent tenant';
COMMENT ON COLUMN public.environments.slug IS 'URL-safe environment identifier';

-- ==========================================
-- Table: vessels
-- ==========================================
-- Vessel/ship registry for maritime operations
CREATE TABLE IF NOT EXISTS public.vessels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.vessels ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.vessels IS 'Vessel/ship registry for maritime operations';
COMMENT ON COLUMN public.vessels.code IS 'Vessel code/identifier';

-- ==========================================
-- Table: password_reset_tokens
-- ==========================================
-- Password reset tokens for custom authentication
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.password_reset_tokens IS 'Password reset tokens';
COMMENT ON COLUMN public.password_reset_tokens.token IS 'Unique reset token';
COMMENT ON COLUMN public.password_reset_tokens.expires_at IS 'Token expiration timestamp';
COMMENT ON COLUMN public.password_reset_tokens.used_at IS 'Token usage timestamp';

-- Verification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users_unified')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'environments')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'vessels')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'password_reset_tokens')
  THEN
    RAISE NOTICE '✅ Layer 2 tables created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create Layer 2 tables';
  END IF;
END $$;

