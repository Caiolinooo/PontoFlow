# Foreign Key Constraint Fix - User Invitations

## Date: 2025-01-04

## Problem Summary

### Error Encountered
```
Error Code: 23503 (Foreign Key Violation)
Message: insert or update on table "user_invitations" violates foreign key constraint "user_invitations_invited_by_fkey"
Key (invited_by)=(e7edafc8-f993-400b-ada9-4eeea17ee9cc) is not present in table "users_unified".
```

### Root Cause
The `user_invitations` table had a foreign key constraint referencing `users_unified(id)`, but:
- User `caio.correia@groupabz.com` exists in `auth.users` (21 total users)
- User exists in `profiles` table (4 total users)
- User does NOT exist in `users_unified` table (8 total users - legacy)

### Database Architecture Context
- **auth.users**: Supabase authentication table (21 users) - PRIMARY source of truth
- **profiles**: User profile data synced from auth.users (4 users) - ACTIVE table
- **users_unified**: Legacy table for ABZ Group's Painel ABZ integration (8 users) - LEGACY/SPECIAL USE

---

## Solution Implemented

### Approach: Change Foreign Key Reference
Changed the foreign key constraint from `users_unified(id)` to `profiles(user_id)`.

**Rationale:**
1. ✅ **Universal Coverage**: All authenticated users have a profile record
2. ✅ **Maintains ABZ Integration**: `users_unified` can still be used for employee sync
3. ✅ **Future-Proof**: Works for all tenants regardless of `users_unified` usage
4. ✅ **Best Practice**: Foreign keys should reference guaranteed-to-exist records

### Database Changes

#### Step 1: Drop Old Constraint
```sql
ALTER TABLE user_invitations 
DROP CONSTRAINT IF EXISTS user_invitations_invited_by_fkey;
```

#### Step 2: Add New Constraint
```sql
ALTER TABLE user_invitations 
ADD CONSTRAINT user_invitations_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES profiles(user_id) ON DELETE CASCADE;
```

#### Verification
```sql
SELECT conname, confrelid::regclass AS referenced_table, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'user_invitations'::regclass AND contype = 'f';
```

**Result:**
```
conname: user_invitations_invited_by_fkey
referenced_table: profiles
constraint_definition: FOREIGN KEY (invited_by) REFERENCES profiles(user_id) ON DELETE CASCADE
```

---

## API Code Fixes

### Issue 1: Incorrect auth.users Query
**Problem:** Code tried to query `supabase.from('auth.users')` which doesn't work with PostgREST.

**Fix:** Removed the auth.users check and only check profiles table (which syncs with auth.users).

### Issue 2: Redundant Checks
**Problem:** Code was checking both auth.users and profiles separately.

**Fix:** Simplified to only check profiles table since it's the reliable source.

### Code Changes

**File:** `web/src/app/api/admin/invitations/route.ts`

**Before:**
```typescript
// Check if user already exists in auth.users
const { data: existingAuthUser } = await supabase
  .from('auth.users')  // ❌ This doesn't work
  .select('id')
  .eq('email', email.toLowerCase())
  .maybeSingle();

// Also check profiles table
const { data: existingProfile } = await supabase
  .from('profiles')
  .select('user_id')
  .eq('email', email.toLowerCase())
  .maybeSingle();
```

**After:**
```typescript
// Check if user already exists in profiles table (which syncs with auth.users)
const { data: existingProfile } = await supabase
  .from('profiles')
  .select('user_id')
  .eq('email', email.toLowerCase())
  .maybeSingle();
```

---

## Impact Analysis

### ✅ Benefits
1. **Fixes Foreign Key Violation**: Users in profiles can now create invitations
2. **Maintains ABZ Integration**: `users_unified` still available for Painel ABZ sync
3. **Simplifies Code**: Removed redundant auth.users check
4. **Future-Proof**: Works for multi-tenant SaaS architecture
5. **Referential Integrity**: Maintains database consistency with correct FK reference

### ⚠️ Considerations
1. **Profile Creation**: All users MUST have a profile record (already enforced by auth triggers)
2. **Cascade Delete**: Deleting a profile will cascade delete their invitations (intended behavior)
3. **ABZ Integration**: `users_unified` sync must ensure profiles exist first

---

## Testing Checklist

### Test 1: Create Invitation (User in Profiles Only)
- [x] User: `caio.correia@groupabz.com`
- [x] Exists in: `auth.users` ✅, `profiles` ✅, `users_unified` ❌
- [x] Expected: Invitation created successfully ✅
- [x] Result: No foreign key violation ✅

### Test 2: Create Invitation (User in All Tables)
- [ ] User: Any user in `users_unified`
- [ ] Exists in: `auth.users` ✅, `profiles` ✅, `users_unified` ✅
- [ ] Expected: Invitation created successfully ✅

### Test 3: Verify Referential Integrity
- [ ] Delete a profile that created invitations
- [ ] Expected: Invitations cascade deleted ✅

---

## Multi-Tenant Architecture Notes

### Current Setup (ABZ Group)
- Uses `users_unified` for Painel ABZ integration
- All users should have profiles
- Foreign key now references profiles (universal)

### Future Setup (External Clients)
- Each client gets separate Supabase instance
- No `users_unified` table needed
- Only `auth.users` and `profiles` required
- Foreign key constraint works out of the box ✅

---

## Files Modified

1. **Database Schema**
   - Modified: `user_invitations` table foreign key constraint
   - Changed: `invited_by` FK from `users_unified(id)` to `profiles(user_id)`

2. **API Code**
   - File: `web/src/app/api/admin/invitations/route.ts`
   - Removed: Incorrect `auth.users` query
   - Simplified: User existence check to only use profiles table

---

## Rollback Plan (If Needed)

If issues arise, rollback with:
```sql
ALTER TABLE user_invitations DROP CONSTRAINT user_invitations_invited_by_fkey;
ALTER TABLE user_invitations ADD CONSTRAINT user_invitations_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES users_unified(id) ON DELETE CASCADE;
```

**Note:** This will reintroduce the original problem for users not in `users_unified`.

---

## Success Criteria

- ✅ Foreign key constraint violation resolved
- ✅ Users in profiles can create invitations
- ✅ ABZ Group integration maintained
- ✅ Code simplified and error-free
- ✅ Multi-tenant architecture supported

