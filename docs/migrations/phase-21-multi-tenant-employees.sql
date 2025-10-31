-- Phase 21: Multi-Tenant Support for Employees
-- Allows employees to belong to multiple tenants (organizations)
-- Recommended approach: One employee record per tenant

-- ============================================================================
-- APPROACH: One employee record per tenant (RECOMMENDED)
-- ============================================================================
-- This approach maintains data isolation and simplifies RLS policies.
-- Each employee-tenant relationship has its own employee record.
-- The profile_id links all records for the same person.

-- Step 1: Add a unique constraint to prevent duplicate employee records per tenant
-- (This is already implicitly enforced by RLS, but we make it explicit)
create unique index if not exists idx_employees_profile_tenant 
  on public.employees(profile_id, tenant_id);

-- Step 2: Create a view to easily see all tenants a user belongs to
create or replace view public.employee_tenants as
select 
  e.profile_id,
  e.id as employee_id,
  e.tenant_id,
  t.name as tenant_name,
  t.slug as tenant_slug,
  e.cargo,
  e.centro_custo,
  e.created_at
from public.employees e
join public.tenants t on t.id = e.tenant_id
order by e.profile_id, t.name;

-- Grant access to authenticated users
grant select on public.employee_tenants to authenticated;

-- Step 3: Create helper function to get all tenants for a user
create or replace function public.get_user_tenants(user_id uuid)
returns table (
  tenant_id uuid,
  tenant_name text,
  tenant_slug text,
  employee_id uuid,
  cargo text,
  centro_custo text
)
language sql
security definer
stable
as $$
  select 
    e.tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    e.id as employee_id,
    e.cargo,
    e.centro_custo
  from public.employees e
  join public.tenants t on t.id = e.tenant_id
  where e.profile_id = user_id
  order by t.name;
$$;

-- Grant execute to authenticated users
grant execute on function public.get_user_tenants(uuid) to authenticated;

-- Step 4: Update RLS policies to support multi-tenant access
-- The existing RLS policies already support this approach since they filter by tenant_id
-- and employees table has one record per tenant.

-- Step 5: Create a function to switch tenant context (for use in application)
-- This will be used when a user selects which tenant they want to work with
create or replace function public.set_tenant_context(tenant_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  user_id uuid;
  has_access boolean;
begin
  -- Get current user
  user_id := auth.uid();
  
  if user_id is null then
    raise exception 'Not authenticated';
  end if;
  
  -- Check if user has access to this tenant
  select exists(
    select 1 from public.employees
    where profile_id = user_id and employees.tenant_id = set_tenant_context.tenant_id
  ) into has_access;
  
  if not has_access then
    raise exception 'User does not have access to this tenant';
  end if;
  
  -- Set the tenant context in the session
  -- This can be used by the application to filter queries
  perform set_config('app.current_tenant_id', tenant_id::text, false);
end;
$$;

grant execute on function public.set_tenant_context(uuid) to authenticated;

-- Step 6: Create a function to get current tenant context
create or replace function public.get_tenant_context()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_tenant_id', true), '')::uuid;
$$;

grant execute on function public.get_tenant_context() to authenticated;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Add an employee to multiple tenants
-- INSERT INTO employees (profile_id, tenant_id, cargo, centro_custo)
-- VALUES 
--   ('user-uuid', 'tenant-1-uuid', 'Engineer', 'CC001'),
--   ('user-uuid', 'tenant-2-uuid', 'Consultant', 'CC002');

-- Example 2: Get all tenants for a user
-- SELECT * FROM get_user_tenants('user-uuid');

-- Example 3: Switch tenant context in application
-- SELECT set_tenant_context('tenant-1-uuid');

-- Example 4: Get current tenant context
-- SELECT get_tenant_context();

-- ============================================================================
-- NOTES FOR APPLICATION DEVELOPERS
-- ============================================================================

-- 1. When a user logs in, fetch all their tenants using get_user_tenants()
-- 2. If user has multiple tenants, show a tenant selector
-- 3. When user selects a tenant, call set_tenant_context() to set the session variable
-- 4. All subsequent queries will use the selected tenant_id
-- 5. Store the selected tenant_id in localStorage for persistence across page reloads
-- 6. When creating timesheets or entries, always use the current tenant context

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- This migration is backward compatible. Existing employees will continue to work.
-- To add an employee to additional tenants, simply insert new employee records
-- with the same profile_id but different tenant_id values.

comment on view public.employee_tenants is 'View showing all tenant associations for employees';
comment on function public.get_user_tenants(uuid) is 'Returns all tenants a user has access to';
comment on function public.set_tenant_context(uuid) is 'Sets the current tenant context for the session';
comment on function public.get_tenant_context() is 'Gets the current tenant context from the session';

