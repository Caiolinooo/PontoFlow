-- ==========================================
-- Database Setup Wizard - Layer 4: Groups & Employees Tables
-- ==========================================
-- Purpose: Create organizational groups and employee records
-- Dependencies: Layer 1 (tenants), Layer 2 (profiles, environments, vessels)
-- Order: 5
-- Tables: groups, employees
-- ==========================================

-- ==========================================
-- Table: groups
-- ==========================================
-- Organizational groups for delegation and management
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  environment_id UUID REFERENCES public.environments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.groups IS 'Organizational groups for delegation and management';
COMMENT ON COLUMN public.groups.tenant_id IS 'Parent tenant';
COMMENT ON COLUMN public.groups.environment_id IS 'Optional environment association';
COMMENT ON COLUMN public.groups.name IS 'Group name';

-- ==========================================
-- Table: employees
-- ==========================================
-- Employee records with profile and vessel associations
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  vessel_id UUID REFERENCES public.vessels(id) ON DELETE SET NULL,
  display_name TEXT,
  cargo TEXT,
  centro_custo TEXT,
  dados_pessoais_json JSONB DEFAULT '{}'::JSONB,
  documentos_json JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, tenant_id)
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.employees IS 'Employee records with profile and vessel associations';
COMMENT ON COLUMN public.employees.profile_id IS 'References profiles(user_id)';
COMMENT ON COLUMN public.employees.vessel_id IS 'Optional vessel assignment';
COMMENT ON COLUMN public.employees.cargo IS 'Employee position/role';
COMMENT ON COLUMN public.employees.centro_custo IS 'Cost center';
COMMENT ON COLUMN public.employees.dados_pessoais_json IS 'Personal data (JSON)';
COMMENT ON COLUMN public.employees.documentos_json IS 'Documents (JSON)';

-- Verification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'groups')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'employees')
  THEN
    RAISE NOTICE '✅ Layer 4 tables created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create Layer 4 tables';
  END IF;
END $$;

