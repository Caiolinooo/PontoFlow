-- ==========================================
-- Database Setup Wizard - Layer 5: Assignment Tables
-- ==========================================
-- Purpose: Create manager-group and employee-group assignment tables
-- Dependencies: Layer 4 (groups, employees), Layer 2 (vessels)
-- Order: 6
-- Tables: manager_group_assignments, employee_group_members, vessel_group_links
-- ==========================================

-- ==========================================
-- Table: manager_group_assignments
-- ==========================================
-- Manager-to-group delegation assignments
CREATE TABLE IF NOT EXISTS public.manager_group_assignments (
  manager_id UUID NOT NULL,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (manager_id, group_id)
);

-- Enable RLS
ALTER TABLE public.manager_group_assignments ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.manager_group_assignments IS 'Manager-to-group delegation assignments';
COMMENT ON COLUMN public.manager_group_assignments.manager_id IS 'Manager user ID (references profiles.user_id)';
COMMENT ON COLUMN public.manager_group_assignments.group_id IS 'Group ID';
COMMENT ON COLUMN public.manager_group_assignments.tenant_id IS 'Tenant ID for isolation';

-- ==========================================
-- Table: employee_group_members
-- ==========================================
-- Employee-to-group membership assignments
CREATE TABLE IF NOT EXISTS public.employee_group_members (
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (employee_id, group_id)
);

-- Enable RLS
ALTER TABLE public.employee_group_members ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.employee_group_members IS 'Employee-to-group membership assignments';
COMMENT ON COLUMN public.employee_group_members.employee_id IS 'Employee ID';
COMMENT ON COLUMN public.employee_group_members.group_id IS 'Group ID';
COMMENT ON COLUMN public.employee_group_members.tenant_id IS 'Tenant ID for isolation';

-- ==========================================
-- Table: vessel_group_links
-- ==========================================
-- Vessel-to-group associations (for maritime operations)
CREATE TABLE IF NOT EXISTS public.vessel_group_links (
  vessel_id UUID NOT NULL REFERENCES public.vessels(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (vessel_id, group_id)
);

-- Enable RLS
ALTER TABLE public.vessel_group_links ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.vessel_group_links IS 'Vessel-to-group associations';
COMMENT ON COLUMN public.vessel_group_links.vessel_id IS 'Vessel ID';
COMMENT ON COLUMN public.vessel_group_links.group_id IS 'Group ID';
COMMENT ON COLUMN public.vessel_group_links.tenant_id IS 'Tenant ID for isolation';

-- Verification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'manager_group_assignments')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'employee_group_members')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'vessel_group_links')
  THEN
    RAISE NOTICE '✅ Layer 5 tables created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create Layer 5 tables';
  END IF;
END $$;

