-- Migration Phase-22: Add tenant_id to delegation tables
-- Execute este SQL diretamente no Supabase Dashboard
-- Versão corrigida para PostgreSQL portability

-- Primeiro, verificar se as tabelas existem
do $$
begin
  if not exists (select 1 from information_schema.tables where table_name = 'manager_group_assignments') then
    raise exception 'Table manager_group_assignments does not exist';
  end if;
  if not exists (select 1 from information_schema.tables where table_name = 'employee_group_members') then
    raise exception 'Table employee_group_members does not exist';
  end if;
end $$;

-- Step 1: Add tenant_id column to manager_group_assignments (safe check)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'manager_group_assignments' and column_name = 'tenant_id') then
    alter table public.manager_group_assignments add column tenant_id uuid;
  end if;
end $$;

-- Step 2: Populate tenant_id from groups table only if column was just added
do $$
declare
  column_was_added boolean := false;
begin
  select count(*) = 0 into column_was_added
  from information_schema.columns
  where table_name = 'manager_group_assignments' and column_name = 'tenant_id';

  if column_was_added then
    update public.manager_group_assignments mga
    set tenant_id = g.tenant_id
    from public.groups g
    where mga.group_id = g.id
      and mga.tenant_id is null;
  end if;
end $$;

-- Step 3: Make tenant_id not null only if we have data
do $$
begin
  -- Check if all rows have tenant_id populated
  if exists (select 1 from public.manager_group_assignments where tenant_id is not null) and
     not exists (select 1 from public.manager_group_assignments where tenant_id is null) then
    alter table public.manager_group_assignments alter column tenant_id set not null;
  end if;
end $$;

-- Step 4: Add foreign key constraint (safe)
do $$
begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'manager_group_assignments_tenant_id_fkey') then
    alter table public.manager_group_assignments
      add constraint manager_group_assignments_tenant_id_fkey
      foreign key (tenant_id) references public.tenants(id) on delete cascade;
  end if;
end $$;

-- Step 5: Create index for better performance
create index if not exists idx_manager_group_assignments_tenant_manager
  on public.manager_group_assignments(tenant_id, manager_id);

-- Step 6: Add tenant_id column to employee_group_members (safe check)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'employee_group_members' and column_name = 'tenant_id') then
    alter table public.employee_group_members add column tenant_id uuid;
  end if;
end $$;

-- Step 7: Populate tenant_id from groups table only if column was just added
do $$
declare
  column_was_added boolean := false;
begin
  select count(*) = 0 into column_was_added
  from information_schema.columns
  where table_name = 'employee_group_members' and column_name = 'tenant_id';

  if column_was_added then
    update public.employee_group_members egm
    set tenant_id = g.tenant_id
    from public.groups g
    where egm.group_id = g.id
      and egm.tenant_id is null;
  end if;
end $$;

-- Step 8: Make tenant_id not null only if we have data
do $$
begin
  -- Check if all rows have tenant_id populated
  if exists (select 1 from public.employee_group_members where tenant_id is not null) and
     not exists (select 1 from public.employee_group_members where tenant_id is null) then
    alter table public.employee_group_members alter column tenant_id set not null;
  end if;
end $$;

-- Step 9: Add foreign key constraint (safe)
do $$
begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'employee_group_members_tenant_id_fkey') then
    alter table public.employee_group_members
      add constraint employee_group_members_tenant_id_fkey
      foreign key (tenant_id) references public.tenants(id) on delete cascade;
  end if;
end $$;

-- Step 10: Create index for better performance
create index if not exists idx_employee_group_members_tenant_employee
  on public.employee_group_members(tenant_id, employee_id);

-- Step 11: Create trigger to auto-populate tenant_id on insert for manager_group_assignments
create or replace function public.set_manager_group_assignment_tenant_id()
returns trigger
language plpgsql
security definer
as $$
begin
  select tenant_id into new.tenant_id
  from public.groups
  where id = new.group_id;
  
  if new.tenant_id is null then
    raise exception 'Cannot determine tenant_id for group_id %', new.group_id;
  end if;
  
  return new;
end;
$$;

drop trigger if exists trg_set_manager_group_assignment_tenant_id on public.manager_group_assignments;
create trigger trg_set_manager_group_assignment_tenant_id
  before insert on public.manager_group_assignments
  for each row
  when (new.tenant_id is null)
  execute function public.set_manager_group_assignment_tenant_id();

-- Step 12: Create trigger to auto-populate tenant_id on insert for employee_group_members
create or replace function public.set_employee_group_member_tenant_id()
returns trigger
language plpgsql
security definer
as $$
begin
  select tenant_id into new.tenant_id
  from public.groups
  where id = new.group_id;
  
  if new.tenant_id is null then
    raise exception 'Cannot determine tenant_id for group_id %', new.group_id;
  end if;
  
  return new;
end;
$$;

drop trigger if exists trg_set_employee_group_member_tenant_id on public.employee_group_members;
create trigger trg_set_employee_group_member_tenant_id
  before insert on public.employee_group_members
  for each row
  when (new.tenant_id is null)
  execute function public.set_employee_group_member_tenant_id();
