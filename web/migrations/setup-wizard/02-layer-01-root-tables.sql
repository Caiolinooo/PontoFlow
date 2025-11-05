-- ==========================================
-- Database Setup Wizard - Layer 1: Root Tables
-- ==========================================
-- Purpose: Create foundational tables with no dependencies
-- Dependencies: Extensions (01-extensions.sql)
-- Order: 2
-- Tables: tenants, _migrations, system_config
-- ==========================================

-- ==========================================
-- Table: tenants
-- ==========================================
-- Multi-tenant root table - all other tables reference this
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  work_mode TEXT NOT NULL DEFAULT 'padrao' CHECK (work_mode IN ('padrao', 'embarcado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_timezone_valid CHECK (timezone ~ '^[A-Za-z_]+/[A-Za-z_]+(-[A-Za-z_]+)*$')
);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.tenants IS 'Multi-tenant root table - organizations/clients';
COMMENT ON COLUMN public.tenants.id IS 'Unique tenant identifier';
COMMENT ON COLUMN public.tenants.name IS 'Tenant display name';
COMMENT ON COLUMN public.tenants.slug IS 'URL-safe tenant identifier';
COMMENT ON COLUMN public.tenants.timezone IS 'Tenant timezone (IANA format)';
COMMENT ON COLUMN public.tenants.work_mode IS 'Work mode: padrao (standard) or embarcado (vessel-based)';

-- ==========================================
-- Table: _migrations
-- ==========================================
-- Migration tracking table
CREATE TABLE IF NOT EXISTS public._migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public._migrations ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public._migrations IS 'Database migration tracking';
COMMENT ON COLUMN public._migrations.name IS 'Migration script name';
COMMENT ON COLUMN public._migrations.executed_at IS 'Execution timestamp';

-- ==========================================
-- Table: system_config
-- ==========================================
-- System-wide configuration key-value store
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.system_config IS 'System-wide configuration settings';
COMMENT ON COLUMN public.system_config.key IS 'Configuration key';
COMMENT ON COLUMN public.system_config.value IS 'Configuration value (JSON or text)';
COMMENT ON COLUMN public.system_config.description IS 'Configuration description';

-- Insert default configuration
INSERT INTO public.system_config (key, value, description)
VALUES 
  ('enable_users_unified_sync', 'false', 'Enable automatic sync from profiles to users_unified'),
  ('default_timezone', 'America/Sao_Paulo', 'Default system timezone'),
  ('default_locale', 'pt-BR', 'Default system locale')
ON CONFLICT (key) DO NOTHING;

-- Verification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tenants')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = '_migrations')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'system_config')
  THEN
    RAISE NOTICE '✅ Layer 1 tables created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create Layer 1 tables';
  END IF;
END $$;

