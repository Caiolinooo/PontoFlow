-- ==========================================
-- Database Setup Wizard - Layer 9: Database Functions
-- ==========================================
-- Purpose: Create all database functions
-- Dependencies: All tables (Layers 1-8)
-- Order: 10
-- Functions: 12+ functions for business logic
-- ==========================================

-- ==========================================
-- Function: get_tenant_timezone
-- ==========================================
-- Returns the timezone for a given tenant
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

COMMENT ON FUNCTION public.get_tenant_timezone(UUID) IS 'Returns timezone for a tenant';

-- ==========================================
-- Function: get_tenant_work_mode
-- ==========================================
-- Returns the work mode for a given tenant
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

COMMENT ON FUNCTION public.get_tenant_work_mode(UUID) IS 'Returns work mode for a tenant';

-- ==========================================
-- Function: timesheet_deadline
-- ==========================================
-- Calculates the deadline for a timesheet based on period start date
CREATE OR REPLACE FUNCTION public.timesheet_deadline(
  periodo_ini DATE, 
  tenant_uuid UUID DEFAULT NULL
)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- Default deadline: 5th of next month at 23:59:59 in tenant timezone
  SELECT (date_trunc('month', periodo_ini)::DATE + INTERVAL '1 month + 4 days')::TIMESTAMPTZ
  AT TIME ZONE COALESCE(
    CASE 
      WHEN tenant_uuid IS NOT NULL THEN public.get_tenant_timezone(tenant_uuid)
      ELSE 'America/Sao_Paulo'
    END,
    'UTC'
  );
$$;

COMMENT ON FUNCTION public.timesheet_deadline(DATE, UUID) IS 'Calculates timesheet deadline';

-- ==========================================
-- Function: timesheet_past_deadline
-- ==========================================
-- Checks if a timesheet is past its deadline
CREATE OR REPLACE FUNCTION public.timesheet_past_deadline(
  periodo_ini DATE, 
  tenant_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NOW() >= public.timesheet_deadline(periodo_ini, tenant_uuid);
$$;

COMMENT ON FUNCTION public.timesheet_past_deadline(DATE, UUID) IS 'Checks if timesheet is past deadline';

-- ==========================================
-- Function: now_in_tenant_timezone
-- ==========================================
-- Returns current timestamp in tenant timezone
CREATE OR REPLACE FUNCTION public.now_in_tenant_timezone(tenant_uuid UUID)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NOW() AT TIME ZONE COALESCE(
    public.get_tenant_timezone(tenant_uuid),
    'America/Sao_Paulo'
  );
$$;

COMMENT ON FUNCTION public.now_in_tenant_timezone(UUID) IS 'Returns current timestamp in tenant timezone';

-- ==========================================
-- Function: convert_to_tenant_timezone
-- ==========================================
-- Converts a timestamp to tenant timezone
CREATE OR REPLACE FUNCTION public.convert_to_tenant_timezone(
  timestamp_value TIMESTAMPTZ,
  tenant_uuid UUID
)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT timestamp_value AT TIME ZONE 'UTC' AT TIME ZONE COALESCE(
    public.get_tenant_timezone(tenant_uuid),
    'America/Sao_Paulo'
  );
$$;

COMMENT ON FUNCTION public.convert_to_tenant_timezone(TIMESTAMPTZ, UUID) IS 'Converts timestamp to tenant timezone';

-- ==========================================
-- Function: get_user_tenants
-- ==========================================
-- Returns all tenants accessible by a user
CREATE OR REPLACE FUNCTION public.get_user_tenants(user_uuid UUID)
RETURNS TABLE(tenant_id UUID, tenant_name TEXT, tenant_slug TEXT, user_role TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT DISTINCT 
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    tur.role AS user_role
  FROM public.tenants t
  INNER JOIN public.tenant_user_roles tur ON tur.tenant_id = t.id
  WHERE tur.user_id = user_uuid
  ORDER BY t.name;
$$;

COMMENT ON FUNCTION public.get_user_tenants(UUID) IS 'Returns all tenants accessible by a user';

-- ==========================================
-- Function: set_tenant_context
-- ==========================================
-- Sets the current tenant context for the session
CREATE OR REPLACE FUNCTION public.set_tenant_context(tenant_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_uuid::TEXT, FALSE);
END;
$$;

COMMENT ON FUNCTION public.set_tenant_context(UUID) IS 'Sets current tenant context for session';

-- ==========================================
-- Function: get_tenant_context
-- ==========================================
-- Gets the current tenant context from the session
CREATE OR REPLACE FUNCTION public.get_tenant_context()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', TRUE), '')::UUID;
$$;

COMMENT ON FUNCTION public.get_tenant_context() IS 'Gets current tenant context from session';

-- ==========================================
-- Function: cleanup_expired_reset_tokens
-- ==========================================
-- Cleans up expired password reset tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < NOW()
    AND used_at IS NULL;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_reset_tokens() IS 'Cleans up expired password reset tokens';

-- ==========================================
-- Function: expire_old_invitations
-- ==========================================
-- Expires old user invitations
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_invitations
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;

COMMENT ON FUNCTION public.expire_old_invitations() IS 'Expires old user invitations';

-- ==========================================
-- Function: calculate_timesheet_hours
-- ==========================================
-- Calculates total hours for a timesheet
CREATE OR REPLACE FUNCTION public.calculate_timesheet_hours(timesheet_uuid UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    SUM(
      EXTRACT(EPOCH FROM (hora_fim - hora_ini)) / 3600
    ),
    0
  )
  FROM public.timesheet_entries
  WHERE timesheet_id = timesheet_uuid;
$$;

COMMENT ON FUNCTION public.calculate_timesheet_hours(UUID) IS 'Calculates total hours for a timesheet';

-- Verification
DO $$
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'get_tenant_timezone',
      'get_tenant_work_mode',
      'timesheet_deadline',
      'timesheet_past_deadline',
      'now_in_tenant_timezone',
      'convert_to_tenant_timezone',
      'get_user_tenants',
      'set_tenant_context',
      'get_tenant_context',
      'cleanup_expired_reset_tokens',
      'expire_old_invitations',
      'calculate_timesheet_hours'
    );

  IF function_count >= 12 THEN
    RAISE NOTICE '✅ Layer 9 functions created successfully (% functions)', function_count;
  ELSE
    RAISE EXCEPTION '❌ Failed to create all Layer 9 functions (only % created)', function_count;
  END IF;
END $$;

