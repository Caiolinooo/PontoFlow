-- FINAL DATABASE FIX - EXECUTE THIS IN SUPABASE SQL EDITOR
-- This will fix the critical database schema issues

-- ==========================================
-- STEP 1: EXECUTE THE TENANT TIMEZONE MIGRATION
-- ==========================================

-- Add missing columns to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS work_mode VARCHAR(50) DEFAULT 'padrao';

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS deadline_day INTEGER DEFAULT 16;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_tenants_timezone ON public.tenants(timezone);
CREATE INDEX IF NOT EXISTS idx_tenants_work_mode ON public.tenants(work_mode);
CREATE INDEX IF NOT EXISTS idx_tenants_deadline_day ON public.tenants(deadline_day);

-- Add documentation
COMMENT ON COLUMN public.tenants.timezone IS 'Tenant timezone for date calculations (e.g., America/Sao_Paulo, America/New_York, Europe/London)';
COMMENT ON COLUMN public.tenants.work_mode IS 'Tenant work mode configuration (e.g., padrao, standard, flexible)';
COMMENT ON COLUMN public.tenants.deadline_day IS 'Deadline day for timesheet submission (1-28, default: 16)';

-- ==========================================
-- STEP 2: UPDATE EXISTING TENANTS
-- ==========================================

-- Update existing tenants with correct ABZ Group values
UPDATE public.tenants 
SET 
  timezone = 'America/Sao_Paulo',
  work_mode = 'padrao', 
  deadline_day = 16
WHERE id = '2376edb6-bcda-47f6-a0c7-cecd701298ca'; -- ABZ Group

UPDATE public.tenants 
SET 
  timezone = 'America/Sao_Paulo',
  work_mode = 'padrao', 
  deadline_day = 16
WHERE 
  id != '2376edb6-bcda-47f6-a0c7-cecd701298ca'
  AND (timezone IS NULL OR work_mode IS NULL OR deadline_day IS NULL);

-- ==========================================
-- STEP 3: CREATE HELPER FUNCTIONS
-- ==========================================

-- Create function to get tenant timezone (safe fallback)
CREATE OR REPLACE FUNCTION public.get_tenant_timezone(tenant_uuid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT timezone FROM public.tenants WHERE id = tenant_uuid), 
    'America/Sao_Paulo'
  );
$$;

-- Create function to get tenant work mode (safe fallback)
CREATE OR REPLACE FUNCTION public.get_tenant_work_mode(tenant_uuid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT work_mode FROM public.tenants WHERE id = tenant_uuid), 
    'padrao'
  );
$$;

-- Create function to get tenant deadline day (safe fallback)
CREATE OR REPLACE FUNCTION public.get_tenant_deadline_day(tenant_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT deadline_day FROM public.tenants WHERE id = tenant_uuid), 
    16
  );
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_tenant_timezone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_work_mode(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_deadline_day(UUID) TO authenticated;

-- ==========================================
-- STEP 4: VERIFICATION
-- ==========================================

-- Verify the fix
SELECT 
  id,
  name,
  slug,
  timezone,
  work_mode,
  deadline_day,
  created_at
FROM public.tenants 
ORDER BY created_at DESC;

-- Test the helper functions
SELECT 
  'get_tenant_timezone' as function_name,
  public.get_tenant_timezone('2376edb6-bcda-47f6-a0c7-cecd701298ca'::uuid) as result
UNION ALL
SELECT 
  'get_tenant_work_mode' as function_name,
  public.get_tenant_work_mode('2376edb6-bcda-47f6-a0c7-cecd701298ca'::uuid) as result
UNION ALL
SELECT 
  'get_tenant_deadline_day' as function_name,
  public.get_tenant_deadline_day('2376edb6-bcda-47f6-a0c7-cecd701298ca'::uuid)::text as result;