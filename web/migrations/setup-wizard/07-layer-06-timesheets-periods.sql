-- ==========================================
-- Database Setup Wizard - Layer 6: Timesheets & Period Tables
-- ==========================================
-- Purpose: Create timesheet headers and period lock tables
-- Dependencies: Layer 4 (employees)
-- Order: 7
-- Tables: timesheets, period_locks
-- ==========================================

-- ==========================================
-- Table: timesheets
-- ==========================================
-- Timesheet headers (one per employee per period)
CREATE TABLE IF NOT EXISTS public.timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  periodo_ini DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'recusado', 'bloqueado')),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_periodo_order CHECK (periodo_ini <= periodo_fim)
);

-- Enable RLS
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.timesheets IS 'Timesheet headers (one per employee per period)';
COMMENT ON COLUMN public.timesheets.employee_id IS 'Employee who owns this timesheet';
COMMENT ON COLUMN public.timesheets.periodo_ini IS 'Period start date';
COMMENT ON COLUMN public.timesheets.periodo_fim IS 'Period end date';
COMMENT ON COLUMN public.timesheets.status IS 'Status: rascunho, enviado, aprovado, recusado, bloqueado';
COMMENT ON COLUMN public.timesheets.approved_by IS 'User ID who approved (references profiles.user_id)';

-- ==========================================
-- Table: period_locks
-- ==========================================
-- Period locking mechanism to prevent changes after approval
CREATE TABLE IF NOT EXISTS public.period_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_by UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, period_month)
);

-- Enable RLS
ALTER TABLE public.period_locks ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.period_locks IS 'Period locking mechanism to prevent changes after approval';
COMMENT ON COLUMN public.period_locks.period_month IS 'Locked period (first day of month)';
COMMENT ON COLUMN public.period_locks.locked_by IS 'User ID who locked the period';
COMMENT ON COLUMN public.period_locks.reason IS 'Reason for locking';

-- Verification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'timesheets')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'period_locks')
  THEN
    RAISE NOTICE '✅ Layer 6 tables created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create Layer 6 tables';
  END IF;
END $$;

