-- TENANT TIMEZONE MIGRATION - CRITICAL FIX
-- Execute this SQL in Supabase SQL Editor to fix the database schema

-- ==========================================
-- STEP 1: ADD MISSING COLUMNS
-- ==========================================

-- Add timezone column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- Add work_mode column to tenants table  
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS work_mode VARCHAR(50) DEFAULT 'padrao';

-- Add deadline_day column to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS deadline_day INTEGER DEFAULT 16;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_timezone ON public.tenants(timezone);
CREATE INDEX IF NOT EXISTS idx_tenants_work_mode ON public.tenants(work_mode);
CREATE INDEX IF NOT EXISTS idx_tenants_deadline_day ON public.tenants(deadline_day);

-- ==========================================
-- STEP 2: ADD DOCUMENTATION
-- ==========================================

COMMENT ON COLUMN public.tenants.timezone IS 'Tenant timezone for date calculations (e.g., America/Sao_Paulo, America/New_York, Europe/London)';
COMMENT ON COLUMN public.tenants.work_mode IS 'Tenant work mode configuration (e.g., padrao, flexible)';
COMMENT ON COLUMN public.tenants.deadline_day IS 'Deadline day for timesheet submission (1-28, default: 16)';

-- ==========================================
-- STEP 3: UPDATE EXISTING TENANTS
-- ==========================================

-- Update existing tenants with default values
UPDATE public.tenants 
SET 
  timezone = COALESCE(timezone, 'America/Sao_Paulo'),
  work_mode = COALESCE(work_mode, 'padrao'), 
  deadline_day = COALESCE(deadline_day, 16)
WHERE 
  timezone IS NULL OR 
  work_mode IS NULL OR 
  deadline_day IS NULL;

-- ==========================================
-- STEP 4: CREATE HELPER FUNCTIONS
-- ==========================================

-- Create function to get tenant timezone
CREATE OR REPLACE FUNCTION public.get_tenant_timezone(tenant_uuid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    timezone, 
    'America/Sao_Paulo'
  ) 
  FROM public.tenants 
  WHERE id = tenant_uuid;
$$;

-- Create function to get current timestamp in tenant timezone
CREATE OR REPLACE FUNCTION public.now_in_tenant_timezone(tenant_uuid UUID)
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT NOW() AT TIME ZONE COALESCE(
    public.get_tenant_timezone(tenant_uuid),
    'America/Sao_Paulo'
  );
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_tenant_timezone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.now_in_tenant_timezone(UUID) TO authenticated;

-- ==========================================
-- STEP 5: VERIFICATION
-- ==========================================

-- Check the results
SELECT 
  id,
  name,
  timezone,
  work_mode,
  deadline_day,
  created_at
FROM public.tenants 
ORDER BY created_at DESC
LIMIT 5;