## Soft Delete Implementation Guide - Phase 4

### 📋 Overview

This guide shows how to update APIs to use soft delete instead of hard delete.

### ✅ Completed Phases

- **Phase 1**: ✅ Added `deleted_at` columns to tables
- **Phase 2**: ✅ Updated RLS policies to filter deleted records
- **Phase 3**: ✅ Created helper functions in `/src/lib/soft-delete/helpers.ts`
- **Phase 4**: 🔄 Update API endpoints (this guide)
- **Phase 5**: ⏳ Remove CASCADE constraints

### 🔄 Phase 4: Update API Endpoints

### API Patterns

#### Before (Hard Delete)
```typescript
// DELETE /api/admin/employees/[id]/route.ts
const { error } = await supabase
  .from('employees')
  .delete()
  .eq('id', id);
```

#### After (Soft Delete)
```typescript
// DELETE /api/admin/employees/[id]/route.ts
import { softDelete } from '@/lib/soft-delete/helpers';

const result = await softDelete('employees', id, user.id);
if (!result.success) {
  return NextResponse.json({ error: result.message }, { status: 400 });
}
```

### Examples by Endpoint

### 1. Employees API

**File**: `src/app/api/admin/employees/[id]/route.ts`

```typescript
import { softDelete, restoreDeleted } from '@/lib/soft-delete/helpers';
import { getApiUser } from '@/lib/auth/server';
import { NextRequest, NextResponse } from 'next/server';

// DELETE - Soft delete employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getApiUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  // Soft delete employee (cascades to timesheets)
  const result = await softDeleteEmployeeCascade(id, user.id);

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: 'Employee soft deleted successfully'
  });
}

// POST - Restore deleted employee
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getApiUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const { action } = await request.json();

  if (action === 'restore') {
    const result = await restoreDeleted('employees', id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Employee restored successfully'
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
```

### 2. Timesheets API

**File**: `src/app/api/employee/timesheets/[id]/route.ts`

```typescript
import { softDelete } from '@/lib/soft-delete/helpers';
import { getApiUser } from '@/lib/auth/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  // Verify ownership or admin role
  const supabase = await getServerSupabase();
  const { data: timesheet } = await supabase
    .from('timesheets')
    .select('employee_id')
    .eq('id', id)
    .single();

  if (!timesheet) {
    return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
  }

  // Check if user owns this timesheet or is admin
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', user.id)
    .eq('id', timesheet.employee_id)
    .single();

  if (!employee && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Soft delete timesheet
  const result = await softDelete('timesheets', id, user.id);

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: 'Timesheet deleted successfully'
  });
}
```

### 3. List APIs - Filter Active Records

**File**: `src/app/api/admin/employees/route.ts`

```typescript
import { getServerSupabase } from '@/lib/supabase/server';
import { withActiveFilter } from '@/lib/soft-delete/helpers';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await getServerSupabase();

  // Option 1: Using helper
  const query = supabase.from('employees').select('*');
  const filteredQuery = withActiveFilter(query);
  const { data, error } = await filteredQuery;

  // Option 2: Manual filter
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .is('deleted_at', null); // Filter out deleted

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ employees: data });
}
```

### 4. Admin - View Deleted Records

**File**: `src/app/api/admin/deleted/route.ts` (NEW)

```typescript
import { getDeletedRecords } from '@/lib/soft-delete/helpers';
import { getApiUser } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table') as SoftDeleteTable;
  const limit = parseInt(searchParams.get('limit') || '100');

  if (!table) {
    return NextResponse.json({ error: 'Table parameter required' }, { status: 400 });
  }

  const deletedRecords = await getDeletedRecords(table, limit);

  return NextResponse.json({
    table,
    count: deletedRecords.length,
    records: deletedRecords
  });
}
```

### 5. Batch Delete

**File**: `src/app/api/admin/employees/batch-delete/route.ts` (NEW)

```typescript
import { softDeleteBatch } from '@/lib/soft-delete/helpers';
import { getApiUser } from '@/lib/auth/server';

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { ids } = await request.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'IDs array required' }, { status: 400 });
  }

  const result = await softDeleteBatch('employees', ids, user.id);

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: `Successfully deleted ${result.count} employees`,
    count: result.count
  });
}
```

### 📊 Migration Checklist

**API Endpoints to Update:**

#### High Priority (User-facing deletes)
- [ ] `/api/admin/employees/[id]` - DELETE
- [ ] `/api/admin/tenants/[id]` - DELETE
- [ ] `/api/admin/groups/[id]` - DELETE
- [ ] `/api/employee/timesheets/[id]` - DELETE

#### Medium Priority (List endpoints - add filters)
- [ ] `/api/admin/employees` - GET (filter active)
- [ ] `/api/admin/tenants` - GET (filter active)
- [ ] `/api/admin/groups` - GET (filter active)
- [ ] `/api/manager/pending-timesheets` - GET (filter active)

#### Low Priority (New admin features)
- [ ] `/api/admin/deleted` - GET (view deleted records)
- [ ] `/api/admin/employees/[id]/restore` - POST (restore)
- [ ] `/api/admin/hard-delete` - DELETE (permanent delete after 90 days)

### 🧪 Testing

#### Test Soft Delete
```bash
# Delete employee
curl -X DELETE http://localhost:3000/api/admin/employees/[id] \
  -H "Cookie: timesheet_session=<token>"

# Verify employee not in list
curl http://localhost:3000/api/admin/employees \
  -H "Cookie: timesheet_session=<token>"

# Admin: View deleted employees
curl "http://localhost:3000/api/admin/deleted?table=employees" \
  -H "Cookie: timesheet_session=<token>"
```

#### Test Restore
```bash
# Restore employee
curl -X POST http://localhost:3000/api/admin/employees/[id]/restore \
  -H "Cookie: timesheet_session=<token>"

# Verify employee back in list
curl http://localhost:3000/api/admin/employees \
  -H "Cookie: timesheet_session=<token>"
```

### 🔍 Verification

After implementing, verify:
1. ✅ Deleted records don't appear in regular queries
2. ✅ RLS policies prevent regular users from seeing deleted records
3. ✅ Service role (admin) can view deleted records
4. ✅ Restore functionality works
5. ✅ Cascade delete works for related records
6. ✅ No 404 errors on existing endpoints

### ⚠️ Important Notes

1. **Always use service role** for soft delete operations (bypasses RLS)
2. **Regular queries** automatically filter `deleted_at IS NULL` via RLS
3. **Cascade manually** - don't rely on database CASCADE (we'll remove those in Phase 5)
4. **Log deletions** - pass `user.id` as `deletedBy` parameter
5. **Test thoroughly** - soft delete changes behavior significantly

### 🎯 Next Steps

After Phase 4 is complete:
- **Phase 5**: Review and remove CASCADE constraints from foreign keys
- This prevents accidental hard deletes

### 📚 Reference

- Helpers: `/src/lib/soft-delete/helpers.ts`
- Migration SQL: `/web/migrations/ADD-SOFT-DELETE-DELETED-AT.sql`
- RLS Policies: `/web/migrations/UPDATE-RLS-SOFT-DELETE.sql`
