-- ==========================================
-- Database Setup Wizard - Layer 7: Timesheet Detail Tables
-- ==========================================
-- Purpose: Create timesheet entries, approvals, and annotations
-- Dependencies: Layer 6 (timesheets), Layer 2 (environments)
-- Order: 8
-- Tables: timesheet_entries, approvals, timesheet_annotations
-- ==========================================

-- ==========================================
-- Table: timesheet_entries
-- ==========================================
-- Individual time entries within a timesheet
CREATE TABLE IF NOT EXISTS public.timesheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  timesheet_id UUID NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  environment_id UUID REFERENCES public.environments(id) ON DELETE SET NULL,
  data DATE NOT NULL,
  hora_ini TIME NOT NULL,
  hora_fim TIME NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('normal', 'extra', 'feriado', 'folga')),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_hora_order CHECK (hora_ini < hora_fim)
);

-- Enable RLS
ALTER TABLE public.timesheet_entries ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.timesheet_entries IS 'Individual time entries within a timesheet';
COMMENT ON COLUMN public.timesheet_entries.timesheet_id IS 'Parent timesheet';
COMMENT ON COLUMN public.timesheet_entries.environment_id IS 'Work environment for this entry';
COMMENT ON COLUMN public.timesheet_entries.data IS 'Entry date';
COMMENT ON COLUMN public.timesheet_entries.hora_ini IS 'Start time';
COMMENT ON COLUMN public.timesheet_entries.hora_fim IS 'End time';
COMMENT ON COLUMN public.timesheet_entries.tipo IS 'Entry type: normal, extra, feriado, folga';

-- ==========================================
-- Table: approvals
-- ==========================================
-- Approval audit trail for timesheets
CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  timesheet_id UUID NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('aprovado', 'recusado')),
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.approvals IS 'Approval audit trail for timesheets';
COMMENT ON COLUMN public.approvals.approver_id IS 'User ID who performed the action';
COMMENT ON COLUMN public.approvals.action IS 'Action: aprovado, recusado';
COMMENT ON COLUMN public.approvals.comentario IS 'Optional comment';

-- ==========================================
-- Table: timesheet_annotations
-- ==========================================
-- Manager annotations/feedback on timesheet entries
CREATE TABLE IF NOT EXISTS public.timesheet_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  timesheet_id UUID NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES public.timesheet_entries(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  texto TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('info', 'warning', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.timesheet_annotations ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.timesheet_annotations IS 'Manager annotations/feedback on timesheet entries';
COMMENT ON COLUMN public.timesheet_annotations.entry_id IS 'Optional specific entry reference';
COMMENT ON COLUMN public.timesheet_annotations.author_id IS 'User ID who created the annotation';
COMMENT ON COLUMN public.timesheet_annotations.tipo IS 'Annotation type: info, warning, error';

-- Verification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'timesheet_entries')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'approvals')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'timesheet_annotations')
  THEN
    RAISE NOTICE '✅ Layer 7 tables created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create Layer 7 tables';
  END IF;
END $$;

