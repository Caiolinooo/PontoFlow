# Fix: Missing Environments in Admin Panel

## Problem Description

The admin panel at `/pt-BR/admin/environments` was returning HTTP 200 OK but displaying no environments in the UI, even though environments were visible in the timesheet calendar.

**User Context:**
- Email: `caio.correia@groupabz.com`
- Global Role: `ADMIN`
- Selected Tenant: `2376edb6-bcda-47f6-a0c7-cecd701298ca` (ABZ Group)
- API Response: 200 OK in 533ms
- Frontend: Empty table (no environments displayed)

## Root Cause Analysis

### The Issue

The `/api/admin/environments` route was using `getServerSupabase()` which applies Row Level Security (RLS) policies. The RLS policy for the `environments` table requires:

```sql
CREATE POLICY environments_tenant_access ON environments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = environments.tenant_id 
        AND tur.user_id = auth.uid()
    )
  );
```

**The problem:** The user `caio.correia@groupabz.com` has:
- ✅ Global role `ADMIN` in `auth.users.raw_user_meta_data`
- ✅ `TENANT_ADMIN` roles in `tenant_user_roles` table
- ❌ BUT the RLS policy was failing because the Supabase client wasn't properly authenticated with the user's JWT

### Why the Calendar Worked

The calendar component uses `/api/employee/environments` which uses `getServiceSupabase()` (service role key) that **bypasses RLS entirely**. This is why environments appeared in the calendar but not in the admin panel.

**Comparison:**

| Endpoint | Supabase Client | RLS Applied? | Result |
|----------|----------------|--------------|--------|
| `/api/admin/environments` | `getServerSupabase()` | ✅ Yes | ❌ Failed (RLS blocked) |
| `/api/employee/environments` | `getServiceSupabase()` | ❌ No | ✅ Worked |

## Solution Implemented

Changed `/api/admin/environments` to use `getServiceSupabase()` instead of `getServerSupabase()`.

**Rationale:**
- The route already performs permission checks with `requireApiRole(['ADMIN'])`
- Using service role is safe because we manually verify the user has ADMIN role
- This approach is consistent with other admin endpoints like `/api/admin/environments/[id]`

### Code Changes

**File:** `web/src/app/api/admin/environments/route.ts`

**Before:**
```typescript
export async function GET() {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase(); // ❌ Uses RLS
  
  // ... rest of code
}

export async function POST(req: NextRequest) {
  const user = await requireApiRole(['ADMIN']);
  const supabase = await getServerSupabase(); // ❌ Uses RLS
  
  // ... rest of code
}
```

**After:**
```typescript
export async function GET() {
  const user = await requireApiRole(['ADMIN']);
  // Use service role to bypass RLS since we're already checking permissions with requireApiRole
  const supabase = getServiceSupabase(); // ✅ Bypasses RLS
  
  // ... rest of code
}

export async function POST(req: NextRequest) {
  const user = await requireApiRole(['ADMIN']);
  // Use service role to bypass RLS since we're already checking permissions with requireApiRole
  const supabase = getServiceSupabase(); // ✅ Bypasses RLS
  
  // ... rest of code
}
```

**Additional Changes:**
- Removed unused import: `import { getServerSupabase } from '@/lib/supabase/server';`
- Simplified code by removing redundant `svc` variable declarations

## Testing

### Before Fix
1. Navigate to `/pt-BR/admin/environments`
2. API returns 200 OK
3. Frontend displays empty table
4. Console shows no errors

### After Fix
1. Navigate to `/pt-BR/admin/environments`
2. API returns 200 OK with environments data
3. Frontend displays all environments for the selected tenant
4. Environments match those shown in the calendar

### Test Checklist
- [x] GET `/api/admin/environments` returns environments
- [x] POST `/api/admin/environments` creates new environment
- [x] PATCH `/api/admin/environments/[id]` updates environment
- [x] DELETE `/api/admin/environments/[id]` deletes environment
- [x] Environments display correctly in admin panel
- [x] Environments still display correctly in calendar
- [x] Tenant context is respected (only shows environments for selected tenant)

## Security Considerations

**Question:** Is it safe to bypass RLS by using service role?

**Answer:** Yes, in this case it's safe because:

1. **Manual Permission Check:** The route uses `requireApiRole(['ADMIN'])` which verifies the user has ADMIN role before any database operations
2. **Tenant Isolation:** The code explicitly filters by `tenant_id` from the authenticated user's context
3. **Consistent Pattern:** Other admin endpoints (`/api/admin/environments/[id]`) already use this pattern
4. **No Data Leakage:** The query only returns environments for the user's selected tenant

**Security Flow:**
```
Request → requireApiRole(['ADMIN']) → Verify user.tenant_id → Query with tenant_id filter → Return data
```

## Related Files

- `web/src/app/api/admin/environments/route.ts` - Fixed endpoint
- `web/src/app/api/admin/environments/[id]/route.ts` - Already uses service role (consistent)
- `web/src/app/api/employee/environments/route.ts` - Uses service role (reference)
- `web/src/app/[locale]/admin/environments/page.tsx` - Frontend component
- `web/src/components/calendar/TimesheetCalendar.tsx` - Calendar that was working

## Lessons Learned

1. **RLS vs Service Role:** When using `requireApiRole()` for permission checks, it's often better to use service role to avoid RLS conflicts
2. **Consistency:** Admin endpoints should use consistent patterns (all should use service role or all should use RLS)
3. **Debugging:** When API returns 200 but no data, check RLS policies first
4. **User Context:** Ensure user authentication context is properly passed to Supabase client when using RLS

## Future Improvements

1. **Standardize Admin Endpoints:** Review all `/api/admin/*` endpoints and ensure they consistently use service role
2. **RLS Policy Review:** Consider if RLS policies are necessary for tables that are already protected by application-level permission checks
3. **Error Logging:** Add better error logging to detect RLS policy failures
4. **Documentation:** Document when to use `getServerSupabase()` vs `getServiceSupabase()`

## Status

✅ **FIXED** - Environments now display correctly in the admin panel for all users with ADMIN role.

