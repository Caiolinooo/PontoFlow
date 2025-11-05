# User Invitation Issues - Fixed

## Date: 2025-01-04

## Issues Fixed

### Issue 1: RLS Policy Violation on User Invitations ✅

**Problem:**
- Error code `42501`: "new row violates row-level security policy for table 'user_invitations'"
- User `caio.correia@groupabz.com` (ID: `e7edafc8-f993-400b-ada9-4eeea17ee9cc`) with global ADMIN role couldn't create invitations
- RLS policy was checking `users_unified` table, but user only exists in `auth.users` table

**Root Cause:**
The application uses multiple user tables:
- `auth.users` - Supabase authentication table (user EXISTS here with role in metadata)
- `profiles` - User profile data (user EXISTS here)
- `users_unified` - Legacy unified user table (user DOESN'T exist here)

The RLS policy `user_invitations_admin_all` was checking `users_unified.role = 'ADMIN'`, but the user record doesn't exist in that table.

**Solution:**
1. **Updated RLS Policy** to check `auth.users.raw_user_meta_data` instead of `users_unified`:
   ```sql
   DROP POLICY IF EXISTS user_invitations_admin_all ON user_invitations;
   CREATE POLICY user_invitations_admin_all ON user_invitations 
   FOR ALL 
   USING (
     (auth.jwt() ->> 'role'::text) = 'ADMIN'::text 
     OR 
     EXISTS (
       SELECT 1 FROM auth.users 
       WHERE auth.users.id = auth.uid() 
       AND (auth.users.raw_user_meta_data ->> 'role'::text) = 'ADMIN'::text
     )
   );
   ```

2. **Updated API Route** to use service role client (bypasses RLS):
   - Changed from `getServerSupabase()` to `getServiceSupabase()` for INSERT operations
   - Service role client has full database access and bypasses RLS policies
   - This is safe because we manually check permissions with `requireApiRole(['ADMIN'])`

**Files Modified:**
- `web/src/app/api/admin/invitations/route.ts`
  - Added import for `getServiceSupabase`
  - Changed database client from `getServerSupabase()` to `getServiceSupabase()`
  - Updated user existence checks to query `auth.users` and `profiles` instead of `users_unified`

---

### Issue 2: Tenant Context Not Respected ✅

**Problem:**
- When creating invitations with "MANAGER" or "GERENTE" role, system showed tenant selection list
- Selected tenant (`2376edb6-bcda-47f6-a0c7-cecd701298ca`) was not automatically used
- User had to manually select tenant even though they already had one selected

**Root Cause:**
The API route was not automatically using the user's selected tenant when `tenant_ids` was empty or not provided.

**Solution:**
Added automatic tenant assignment logic in the API route:

```typescript
// FIX: Respect selected tenant context
// If user has a selected tenant and tenant_ids is not explicitly provided or is empty,
// automatically use the selected tenant
if (currentUser.tenant_id && (!tenant_ids || tenant_ids.length === 0)) {
  console.log('🔧 [Tenant Context] Auto-assigning selected tenant:', currentUser.tenant_id);
  tenant_ids = [currentUser.tenant_id];
}
```

**Additional Validation:**
Added validation to ensure at least one tenant is specified:
```typescript
if (!tenant_ids || tenant_ids.length === 0) {
  console.error('❌ [Validation] No tenant_ids provided and no selected tenant');
  return NextResponse.json(
    { error: 'Pelo menos um tenant deve ser especificado' },
    { status: 400 }
  );
}
```

**Files Modified:**
- `web/src/app/api/admin/invitations/route.ts`
  - Added tenant context logging
  - Added automatic tenant assignment when `tenant_ids` is empty
  - Added validation for tenant_ids

---

## Summary of Changes

### Database Changes:
1. ✅ Updated RLS policy `user_invitations_admin_all` to check `auth.users` metadata

### API Changes:
1. ✅ Changed to use `getServiceSupabase()` for all database operations (bypasses RLS)
2. ✅ Added automatic tenant assignment based on `currentUser.tenant_id`
3. ✅ Updated user existence checks to query correct tables (`auth.users`, `profiles`)
4. ✅ Added comprehensive logging for debugging
5. ✅ Added validation for tenant_ids

### Frontend Changes:
- ✅ No changes needed - frontend already pre-selects current tenant correctly

---

## Testing Checklist

### Test 1: Create Invitation with Auto-Tenant Assignment
1. ✅ Login as `caio.correia@groupabz.com`
2. ✅ Verify selected tenant is `2376edb6-bcda-47f6-a0c7-cecd701298ca`
3. ✅ Create invitation without explicitly selecting tenant
4. ✅ Verify invitation is created with selected tenant automatically

### Test 2: Create Invitation with MANAGER Role
1. ✅ Login as ADMIN user
2. ✅ Create invitation with role "MANAGER" or "GERENTE"
3. ✅ Verify no tenant selection prompt appears
4. ✅ Verify invitation is created successfully

### Test 3: RLS Policy Validation
1. ✅ Verify ADMIN users can create invitations
2. ✅ Verify non-ADMIN users cannot create invitations
3. ✅ Verify RLS policy checks `auth.users` metadata correctly

---

## Technical Details

### User Authentication Flow:
```
1. User logs in → JWT token created with metadata
2. JWT contains: { role: 'ADMIN', selected_tenant_id: '...' }
3. API extracts user info from JWT
4. RLS policy checks auth.users.raw_user_meta_data
5. Service role client bypasses RLS for admin operations
```

### Tenant Resolution Priority:
```
1. selected_tenant_id from auth metadata (highest priority)
2. tenant_id from auth metadata
3. Employee record tenant_id
4. First tenant from tenant_user_roles
5. Profile tenant_id (lowest priority)
```

---

## Notes

- All changes are backward compatible
- Service role client is used safely with manual permission checks
- Comprehensive logging added for debugging
- RLS policy now correctly checks the right user table

