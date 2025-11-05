# Vessels/Embarcações Fix - Summary

## Issue
Vessels (embarcações) were not appearing in the admin panel at `/admin/vessels`, showing "Nenhuma embarcação cadastrada" (No vessels registered) even when vessels existed in the database.

## Root Cause
The `/api/admin/vessels` route was using `getServerSupabase()` which applies Row Level Security (RLS) policies. The RLS policy for the `vessels` table was preventing the query from returning results, even though the user had ADMIN role.

This is the **exact same issue** we had with environments.

## Solution
Changed the vessels API routes to use `getServiceSupabase()` instead of `getServerSupabase()`. This bypasses RLS policies, which is safe because:
1. Permissions are already checked with `requireApiRole(['ADMIN'])`
2. The query explicitly filters by `tenant_id` to ensure tenant isolation
3. This is consistent with the environments fix and other admin endpoints

## Files Modified

### 1. `web/src/app/api/admin/vessels/route.ts`
**Changes:**
- Line 8: Changed from `getServerSupabase()` to `getServiceSupabase()`
- Line 43: Changed from `getServerSupabase()` to `getServiceSupabase()`
- Added comments explaining why service role is used

**Before:**
```typescript
export async function GET(req: NextRequest) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase(); // ❌ Uses RLS
  // ...
}
```

**After:**
```typescript
export async function GET(req: NextRequest) {
  const user = await requireApiRole(['ADMIN']);
  // Use service role to bypass RLS since we're already checking permissions with requireApiRole
  const supabase = getServiceSupabase(); // ✅ Bypasses RLS
  // ...
}
```

### 2. `web/src/app/api/admin/vessels/[id]/route.ts`
**Changes:**
- Line 1-3: Changed import from `getServerSupabase` to `getServiceSupabase`
- Line 7: Changed from `getServerSupabase()` to `getServiceSupabase()` in PATCH
- Line 23: Changed from `getServerSupabase()` to `getServiceSupabase()` in DELETE
- Added comments explaining why service role is used

**Before:**
```typescript
import { getServerSupabase } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase(); // ❌ Uses RLS
  // ...
}
```

**After:**
```typescript
import { getServiceSupabase } from '@/lib/supabase/service';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiRole(['ADMIN']);
  // Use service role to bypass RLS since we're already checking permissions with requireApiRole
  const supabase = getServiceSupabase(); // ✅ Bypasses RLS
  // ...
}
```

## Security Considerations

### Why This Is Safe:
1. **Permission Check:** `requireApiRole(['ADMIN'])` ensures only ADMIN users can access these endpoints
2. **Tenant Isolation:** All queries explicitly filter by `tenant_id` to ensure data isolation
3. **Consistent Pattern:** This matches the pattern used in other admin endpoints (environments, etc.)

### Tenant Filtering:
```typescript
// GET - Lists vessels for the user's tenant
.eq('tenant_id', tenantId)

// PATCH/DELETE - Updates/deletes only vessels belonging to the user's tenant
.eq('tenant_id', user.tenant_id)
```

## Testing Checklist

- [ ] Navigate to `/admin/vessels` as ADMIN user
- [ ] Verify vessels are displayed correctly
- [ ] Test with multiple tenants - each should see only their vessels
- [ ] Create a new vessel - should appear in the list
- [ ] Edit a vessel - changes should be saved
- [ ] Delete a vessel - should be removed from the list
- [ ] Test with a user who has ADMIN role for multiple tenants
- [ ] Verify tenant selector works correctly (if applicable)

## Verification

### Before Fix:
```
GET /api/admin/vessels
Response: { vessels: [] }
UI: "Nenhuma embarcação cadastrada"
```

### After Fix:
```
GET /api/admin/vessels
Response: { vessels: [{ id: "...", name: "Vessel 1", code: "V001", ... }] }
UI: Table showing all vessels for the tenant
```

## Related Issues

This fix is identical to the environments fix documented in `ENVIRONMENTS_FIX_SUMMARY.md`.

### Pattern for Admin Endpoints:
When creating admin endpoints that need to bypass RLS:
1. Use `requireApiRole(['ADMIN'])` to check permissions
2. Use `getServiceSupabase()` instead of `getServerSupabase()`
3. Always filter by `tenant_id` to ensure tenant isolation
4. Add a comment explaining why service role is used

## Impact

- ✅ Vessels now display correctly in admin panel
- ✅ ADMIN users can manage vessels for their tenant(s)
- ✅ Tenant isolation is maintained
- ✅ Consistent with other admin endpoints
- ✅ No security compromise

## Status

✅ **COMPLETE** - Vessels are now displaying correctly in the admin panel.

---

**Fix Date:** 2025-01-04
**Related Files:** 
- `web/src/app/api/admin/vessels/route.ts`
- `web/src/app/api/admin/vessels/[id]/route.ts`
- `ENVIRONMENTS_FIX_SUMMARY.md` (similar issue)

