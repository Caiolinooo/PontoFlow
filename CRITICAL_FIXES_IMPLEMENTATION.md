# Critical Fixes Implementation Guide

## Immediate Actions Required

### 1. Fix Redis Dependency (Critical - Do First)

```bash
# Install missing dependency
cd web && npm install ioredis

# Restart development server
npm run dev
```

### 2. Fix API Query Logic (Critical - Do Second)

**File**: `web/src/app/api/manager/pending-timesheets/route.ts`

**Replace lines 94-127** with the corrected implementation:

```typescript
// Apply role-based filtering
if (user.role === 'MANAGER' || user.role === 'MANAGER_TIMESHEET') {
  // For managers, we need to filter by their assigned groups
  let managerGroupsQuery = supabase
    .from('manager_group_assignments')
    .select('group_id, tenant_id')
    .eq('manager_id', user.id);

  // Check if tenant_id column exists in manager_group_assignments
  const { data: hasTenantId } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'manager_group_assignments')
    .eq('column_name', 'tenant_id')
    .single();

  if (hasTenantId) {
    // Use optimized query with tenant_id (after migration)
    managerGroupsQuery = managerGroupsQuery.eq('tenant_id', user.tenant_id);
  }

  const { data: managerGroups } = await managerGroupsQuery;

  const groupIds = managerGroups?.map(g => g.group_id) || [];
  
  if (groupIds.length === 0) {
    return NextResponse.json({ 
      pending_timesheets: [], 
      total: 0,
      message: 'Nenhum grupo atribuído ao gerente'
    });
  }

  // Get employees in manager's groups with proper tenant filtering
  let groupMembersQuery = supabase
    .from('employee_group_members')
    .select('employee_id, tenant_id')
    .in('group_id', groupIds);

  if (hasTenantId) {
    // Use optimized query with tenant_id (after migration)  
    groupMembersQuery = groupMembersQuery.eq('tenant_id', user.tenant_id);
  }

  const { data: groupMembers } = await groupMembersQuery;

  const employeeIds = groupMembers?.map(m => m.employee_id) || [];
  
  if (employeeIds.length === 0) {
    return NextResponse.json({ 
      pending_timesheets: [], 
      total: 0,
      message: 'Nenhum funcionário nos grupos atribuídos'
    });
  }

  query = query.in('employee_id', employeeIds);
}
```

### 3. Apply Database Migration (Critical - Do Third)

**Execute this SQL in Supabase SQL Editor**:

```sql
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
```

### 4. Verify Migration Success

**Run this query to verify**:
```sql
-- Check if tenant_id columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('manager_group_assignments', 'employee_group_members')
  AND column_name = 'tenant_id';

-- Should return 2 rows showing both tables have tenant_id columns
```

### 5. Test API After Fixes

**Create test data**:
```sql
-- Create a test timesheet with 'enviado' status
INSERT INTO timesheets (tenant_id, employee_id, periodo_ini, periodo_fim, status)
VALUES (
  'your-tenant-id',
  'your-employee-id', 
  '2025-10-01',
  '2025-10-31',
  'enviado'
);
```

### 6. Frontend Error Handling Improvements

**File**: `web/src/app/[locale]/manager/pending/page.tsx`

**Replace lines 19-31** with better error handling:

```typescript
// Fetch pending timesheets for manager approval
let items: Array<{ employee: { id: string; display_name: string | null }, timesheet: { id: string; periodo_ini: string; periodo_fim: string } | null, status: string, entries: number } > = [];
try {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/manager/pending-timesheets?month=${encodeURIComponent(targetMonth)}&status=enviado` as string, { cache: 'no-store' });
  
  if (res.ok) {
    const j = await res.json();
    // Convert the pending-timesheets response format to match expected format
    items = Array.isArray(j?.pending_timesheets) ? j.pending_timesheets.map((ts: any) => ({
      employee: { id: ts.employee_id, display_name: ts.employee?.display_name || null },
      timesheet: { id: ts.id, periodo_ini: ts.periodo_ini, periodo_fim: ts.periodo_fim },
      status: ts.status,
      entries: ts.entries_count || 0
    })) : [];
  } else {
    console.error('API Error:', res.status, await res.text());
  }
} catch (error) {
  console.error('Network error:', error);
}
```

## Verification Checklist

After applying fixes:

- [ ] Redis dependency installed, no more module errors
- [ ] Database migration applied successfully
- [ ] API returns data instead of 401/500 errors
- [ ] Frontend shows actual pending timesheets (not empty state)
- [ ] Manager can see employee timesheets for approval
- [ ] Performance improved with tenant_id columns

## Rollback Plan

If issues occur:

1. **Revert package.json**: Remove `ioredis` from dependencies
2. **Revert API changes**: Keep original query logic  
3. **Skip migration**: Don't apply the database migration
4. **Clear cache**: Restart development server

## Expected Result

After all fixes:
1. Managers will see pending timesheets in `/manager/pending`
2. API will return actual submitted timesheets for approval
3. Performance will improve with optimized queries
4. System will be ready for production deployment