-- Phase 23: Tenant Timezone Support
-- Add timezone field to tenants table for multi-country support

-- Add timezone field to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- Add comment for timezone column
COMMENT ON COLUMN public.tenants.timezone IS 'Tenant timezone for date calculations (e.g., America/Sao_Paulo, America/New_York, Europe/London)';

-- Create timezone validation constraint
ALTER TABLE public.tenants
ADD CONSTRAINT IF NOT EXISTS check_timezone_valid 
CHECK (timezone ~ '^[A-Za-z_]+\/[A-Za-z_]+(-[A-Za-z_]+)*$');

-- Update existing tenants to default timezone if not set
UPDATE public.tenants 
SET timezone = 'America/Sao_Paulo' 
WHERE timezone IS NULL OR timezone = '';

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

-- Create function to convert timestamp to tenant timezone
CREATE OR REPLACE FUNCTION public.convert_to_tenant_timezone(
  timestamp_value timestamptz,
  tenant_uuid UUID
)
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT timestamp_value AT TIME ZONE 'UTC' AT TIME ZONE COALESCE(
    public.get_tenant_timezone(tenant_uuid),
    'America/Sao_Paulo'
  );
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

-- Update existing timesheet_deadline function to respect tenant timezone
CREATE OR REPLACE FUNCTION public.timesheet_deadline(periodo_ini date, tenant_uuid UUID DEFAULT NULL)
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  -- Default deadline: 5th of next month
  SELECT (date_trunc('month', periodo_ini)::date + interval '1 month + 4 days')::timestamptz
  AT TIME ZONE COALESCE(
    CASE 
      WHEN tenant_uuid IS NOT NULL THEN public.get_tenant_timezone(tenant_uuid)
      ELSE 'America/Sao_Paulo'
    END,
    'UTC'
  );
$$;

-- Update existing timesheet_past_deadline function to respect tenant timezone
CREATE OR REPLACE FUNCTION public.timesheet_past_deadline(periodo_ini date, tenant_uuid UUID DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT NOW() AT TIME ZONE COALESCE(
    CASE 
      WHEN tenant_uuid IS NOT NULL THEN public.get_tenant_timezone(tenant_uuid)
      ELSE 'America/Sao_Paulo'
    END,
    'UTC'
  ) >= public.timesheet_deadline(periodo_ini, tenant_uuid);
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_tenant_timezone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_to_tenant_timezone(timestamptz, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.now_in_tenant_timezone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.timesheet_deadline(date, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.timesheet_past_deadline(date, UUID) TO authenticated;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tenants_timezone ON public.tenants(timezone);

-- Update RLS policies to include timezone context
-- Update timesheets policies to use timezone-aware functions
DROP POLICY IF EXISTS timesheets_employee_update ON public.timesheets;
CREATE POLICY timesheets_employee_update ON public.timesheets
  FOR UPDATE USING (
    exists (
      select 1 from public.employees e
      where e.id = timesheets.employee_id
        and e.tenant_id = timesheets.tenant_id
        and e.profile_id = auth.uid()
    )
    and not public.timesheet_past_deadline(timesheets.periodo_ini, timesheets.tenant_id)
  ) with check (
    exists (
      select 1 from public.employees e
      where e.id = timesheets.employee_id
        and e.tenant_id = timesheets.tenant_id
        and e.profile_id = auth.uid()
    )
    and not public.timesheet_past_deadline(timesheets.periodo_ini, timesheets.tenant_id)
  );

-- Update timesheet_entries policies to use timezone-aware functions
DROP POLICY IF EXISTS timesheet_entries_employee_modify ON public.timesheet_entries;
CREATE POLICY timesheet_entries_employee_modify ON public.timesheet_entries
  FOR ALL USING (
    exists (
      select 1 from public.timesheets t
      join public.employees e on e.id = t.employee_id
      where t.id = timesheet_entries.timesheet_id
        and e.profile_id = auth.uid()
        and not public.timesheet_past_deadline(t.periodo_ini, t.tenant_id)
    )
  ) with check (
    exists (
      select 1 from public.timesheets t
      join public.employees e on e.id = t.employee_id
      where t.id = timesheet_entries.timesheet_id
        and e.profile_id = auth.uid()
        and not public.timesheet_past_deadline(t.periodo_ini, t.tenant_id)
    )
  );