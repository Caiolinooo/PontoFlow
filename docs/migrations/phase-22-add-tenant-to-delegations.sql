-- Phase 22: Add tenant_id to delegation tables for better query performance
-- This migration adds tenant_id columns to manager_group_assignments and employee_group_members
-- to avoid expensive joins when filtering by tenant

-- Step 1: Add tenant_id column to manager_group_assignments
alter table public.manager_group_assignments 
  add column if not exists tenant_id uuid;

-- Step 2: Populate tenant_id from groups table
update public.manager_group_assignments mga
set tenant_id = g.tenant_id
from public.groups g
where mga.group_id = g.id
  and mga.tenant_id is null;

-- Step 3: Make tenant_id not null after population
alter table public.manager_group_assignments 
  alter column tenant_id set not null;

-- Step 4: Add foreign key constraint
alter table public.manager_group_assignments
  add constraint manager_group_assignments_tenant_id_fkey 
  foreign key (tenant_id) references public.tenants(id) on delete cascade;

-- Step 5: Create index for better performance
create index if not exists idx_manager_group_assignments_tenant_manager 
  on public.manager_group_assignments(tenant_id, manager_id);

-- Step 6: Add tenant_id column to employee_group_members
alter table public.employee_group_members 
  add column if not exists tenant_id uuid;

-- Step 7: Populate tenant_id from groups table
update public.employee_group_members egm
set tenant_id = g.tenant_id
from public.groups g
where egm.group_id = g.id
  and egm.tenant_id is null;

-- Step 8: Make tenant_id not null after population
alter table public.employee_group_members 
  alter column tenant_id set not null;

-- Step 9: Add foreign key constraint
alter table public.employee_group_members
  add constraint employee_group_members_tenant_id_fkey 
  foreign key (tenant_id) references public.tenants(id) on delete cascade;

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

create trigger trg_set_employee_group_member_tenant_id
  before insert on public.employee_group_members
  for each row
  when (new.tenant_id is null)
  execute function public.set_employee_group_member_tenant_id();

-- Step 13: Update RLS policies to use tenant_id directly (more efficient)
-- Note: This is optional - the existing RLS policies will continue to work
-- but these new policies will be more efficient

-- Drop old policies if they exist
drop policy if exists manager_group_assignments_select on public.manager_group_assignments;
drop policy if exists employee_group_members_select on public.employee_group_members;

-- Create new optimized policies for manager_group_assignments
create policy manager_group_assignments_select on public.manager_group_assignments
  for select using (
    tenant_id in (
      select tenant_id from public.tenant_user_roles
      where user_id = auth.uid()
    )
  );

create policy manager_group_assignments_insert on public.manager_group_assignments
  for insert with check (
    tenant_id in (
      select tenant_id from public.tenant_user_roles
      where user_id = auth.uid() 
        and role in ('TENANT_ADMIN', 'ADMIN_GLOBAL')
    )
  );

create policy manager_group_assignments_delete on public.manager_group_assignments
  for delete using (
    tenant_id in (
      select tenant_id from public.tenant_user_roles
      where user_id = auth.uid() 
        and role in ('TENANT_ADMIN', 'ADMIN_GLOBAL')
    )
  );

-- Create new optimized policies for employee_group_members
create policy employee_group_members_select on public.employee_group_members
  for select using (
    tenant_id in (
      select tenant_id from public.tenant_user_roles
      where user_id = auth.uid()
    )
  );

create policy employee_group_members_insert on public.employee_group_members
  for insert with check (
    tenant_id in (
      select tenant_id from public.tenant_user_roles
      where user_id = auth.uid() 
        and role in ('TENANT_ADMIN', 'ADMIN_GLOBAL')
    )
  );

create policy employee_group_members_delete on public.employee_group_members
  for delete using (
    tenant_id in (
      select tenant_id from public.tenant_user_roles
      where user_id = auth.uid() 
        and role in ('TENANT_ADMIN', 'ADMIN_GLOBAL')
    )
  );

-- Step 14: Add comments for documentation
comment on column public.manager_group_assignments.tenant_id is 
  'Tenant ID denormalized from groups table for query performance. Auto-populated by trigger.';

comment on column public.employee_group_members.tenant_id is 
  'Tenant ID denormalized from groups table for query performance. Auto-populated by trigger.';

