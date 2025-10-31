-- ============================================================================
-- PONTOFLOW - MIGRATIONS PENDENTES
-- ============================================================================
-- Este arquivo consolida todas as migrations pendentes para execução fácil
-- Execute este arquivo completo no Supabase SQL Editor
-- 
-- Data: 2025-10-27
-- Versão: 1.0.0
-- 
-- IMPORTANTE: Este script é idempotente e seguro para executar múltiplas vezes
-- ============================================================================

-- ============================================================================
-- PHASE 20: Environment Entries
-- ============================================================================
-- Adiciona suporte a ambientes de trabalho nos lançamentos de timesheet

-- Add environment_id column to timesheet_entries
alter table public.timesheet_entries
add column if not exists environment_id uuid references public.environments(id) on delete set null;

-- Create index for faster queries
create index if not exists idx_entries_environment on public.timesheet_entries(environment_id);

-- Add comment for documentation
comment on column public.timesheet_entries.environment_id is 'Work environment (location) where this entry occurred. Each tenant has its own environments.';

-- ============================================================================
-- PHASE 21: Multi-Tenant Support for Employees
-- ============================================================================
-- Permite que colaboradores pertençam a múltiplos tenants (organizações)

-- Step 1: Add a unique constraint to prevent duplicate employee records per tenant
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

-- Step 4: Create a function to switch tenant context
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
  perform set_config('app.current_tenant_id', tenant_id::text, false);
end;
$$;

grant execute on function public.set_tenant_context(uuid) to authenticated;

-- Step 5: Create a function to get current tenant context
create or replace function public.get_tenant_context()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_tenant_id', true), '')::uuid;
$$;

grant execute on function public.get_tenant_context() to authenticated;

-- Add comments for documentation
comment on view public.employee_tenants is 'View showing all tenant associations for employees';
comment on function public.get_user_tenants(uuid) is 'Returns all tenants a user has access to';
comment on function public.set_tenant_context(uuid) is 'Sets the current tenant context for the session';
comment on function public.get_tenant_context() is 'Gets the current tenant context from the session';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Execute estas queries para verificar se as migrations foram aplicadas

-- Verificar coluna environment_id
-- select column_name, data_type from information_schema.columns 
-- where table_name = 'timesheet_entries' and column_name = 'environment_id';

-- Verificar índice multi-tenant
-- select indexname from pg_indexes 
-- where tablename = 'employees' and indexname = 'idx_employees_profile_tenant';

-- Verificar view employee_tenants
-- select viewname from pg_views where viewname = 'employee_tenants';

-- Verificar funções
-- select routine_name from information_schema.routines 
-- where routine_name in ('get_user_tenants', 'set_tenant_context', 'get_tenant_context');

-- ============================================================================
-- MIGRATIONS COMPLETED SUCCESSFULLY
-- ============================================================================
-- Se você chegou até aqui sem erros, as migrations foram aplicadas com sucesso!
-- 
-- Próximos passos:
-- 1. Reinicie o servidor de desenvolvimento
-- 2. Teste a funcionalidade de ambientes de trabalho
-- 3. Teste a funcionalidade multi-tenant
-- 4. Configure o CRON_SECRET no Vercel
-- ============================================================================

