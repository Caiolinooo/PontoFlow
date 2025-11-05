# Test Plan: Foreign Key Constraint Fix

## Date: 2025-01-04

## Overview
Testing the fix for foreign key constraint violation on `user_invitations.invited_by` column.

---

## Test Environment

### User Details
- **Email**: `caio.correia@groupabz.com`
- **User ID**: `e7edafc8-f993-400b-ada9-4eeea17ee9cc`
- **Global Role**: `ADMIN`
- **Selected Tenant**: `2376edb6-bcda-47f6-a0c7-cecd701298ca`
- **Exists in**:
  - ✅ `auth.users`
  - ✅ `profiles`
  - ❌ `users_unified`

### Database State
- **auth.users**: 21 users
- **profiles**: 4 users
- **users_unified**: 8 users (legacy)

---

## Test 1: Create Invitation with MANAGER_TIMESHEET Role

### Objective
Verify that users in profiles (but not in users_unified) can create invitations without FK violations.

### Steps
1. Login as `caio.correia@groupabz.com`
2. Navigate to Users/Invitations page
3. Click "Create Invitation"
4. Fill in the form:
   - **Email**: `suporte@groupabz.com`
   - **First Name**: `teste`
   - **Last Name**: `teste`
   - **Role**: `MANAGER_TIMESHEET`
   - **Group**: `3b3affec-e3c3-45f6-818d-b361a4894e8e`
   - **Managed Group**: `3b3affec-e3c3-45f6-818d-b361a4894e8e`
5. Submit the form

### Expected Results
- ✅ No error code `23503` (Foreign Key Violation)
- ✅ No error message about `users_unified`
- ✅ Invitation created successfully
- ✅ Invitation assigned to tenant `2376edb6-bcda-47f6-a0c7-cecd701298ca`
- ✅ Success message displayed

### Console Logs to Verify
```
✅ [Auth] User authenticated: caio.correia@groupabz.com Role: ADMIN
✅ [Auth] User tenant_id: 2376edb6-bcda-47f6-a0c7-cecd701298ca
🔧 [Tenant Context] Auto-assigning selected tenant: 2376edb6-bcda-47f6-a0c7-cecd701298ca
🔍 [Database] Checking for existing user with email: suporte@groupabz.com
✅ [Database] No existing user found
💾 [Database] Creating invitation with data: { invited_by: "e7edafc8-f993-400b-ada9-4eeea17ee9cc", ... }
✅ [Database] Invitation created successfully: <invitation-id>
```

### Error Logs to NOT See
```
❌ Error code: 23503
❌ violates foreign key constraint "user_invitations_invited_by_fkey"
❌ Key (invited_by)=(e7edafc8-f993-400b-ada9-4eeea17ee9cc) is not present in table "users_unified"
❌ relation "public.auth.users" does not exist
```

---

## Test 2: Create Invitation with USER Role

### Steps
1. Login as `caio.correia@groupabz.com`
2. Create invitation with:
   - **Email**: `test.user@example.com`
   - **First Name**: `Test`
   - **Last Name**: `User`
   - **Role**: `USER`

### Expected Results
- ✅ Invitation created successfully
- ✅ No FK violation errors
- ✅ Tenant auto-assigned correctly

---

## Test 3: Create Invitation with MANAGER Role

### Steps
1. Login as `caio.correia@groupabz.com`
2. Create invitation with:
   - **Email**: `test.manager@example.com`
   - **First Name**: `Test`
   - **Last Name**: `Manager`
   - **Role**: `MANAGER` or `GERENTE`

### Expected Results
- ✅ Invitation created successfully
- ✅ No tenant selection prompt
- ✅ No FK violation errors

---

## Test 4: Verify Database Constraint

### SQL Query
```sql
SELECT conname, confrelid::regclass AS referenced_table, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'user_invitations'::regclass AND contype = 'f';
```

### Expected Result
```
conname: user_invitations_invited_by_fkey
referenced_table: profiles
constraint_definition: FOREIGN KEY (invited_by) REFERENCES profiles(user_id) ON DELETE CASCADE
```

### Verification Points
- ✅ Constraint name: `user_invitations_invited_by_fkey`
- ✅ References: `profiles` table (NOT `users_unified`)
- ✅ Column: `user_id` (NOT `id`)
- ✅ On Delete: `CASCADE`

---

## Test 5: Verify Invitation Records

### SQL Query
```sql
SELECT id, email, role, status, tenant_ids, invited_by, created_at
FROM user_invitations 
WHERE invited_by = 'e7edafc8-f993-400b-ada9-4eeea17ee9cc'
ORDER BY created_at DESC 
LIMIT 5;
```

### Expected Results
- ✅ All invitations visible
- ✅ `invited_by` = `e7edafc8-f993-400b-ada9-4eeea17ee9cc`
- ✅ `tenant_ids` contains correct tenant ID
- ✅ `status` = `pending`
- ✅ All fields populated correctly

---

## Test 6: Verify Cascade Delete (Optional)

### Steps
1. Create a test invitation
2. Note the invitation ID
3. Delete the inviting user's profile (DO NOT DO THIS IN PRODUCTION)
4. Check if invitation was cascade deleted

### Expected Results
- ✅ Invitation deleted when profile deleted
- ✅ Referential integrity maintained

**⚠️ WARNING**: Do NOT run this test in production. Only test in development environment.

---

## Test 7: ABZ Integration Compatibility

### Objective
Verify that users in `users_unified` can still create invitations.

### Prerequisites
- User exists in `auth.users`, `profiles`, AND `users_unified`

### Steps
1. Login as a user who exists in all three tables
2. Create an invitation
3. Verify success

### Expected Results
- ✅ Invitation created successfully
- ✅ No errors or warnings
- ✅ Backward compatibility maintained

---

## Regression Tests

### Test 8: Existing Functionality
- [ ] List invitations
- [ ] View invitation details
- [ ] Resend invitation email
- [ ] Cancel/delete invitation
- [ ] Accept invitation (from invited user perspective)

### Expected Results
- ✅ All existing functionality works as before
- ✅ No breaking changes

---

## Success Criteria

All tests must pass with:
- ✅ No error code `23503` (Foreign Key Violation)
- ✅ No error about `users_unified` table
- ✅ No error about `public.auth.users` not existing
- ✅ Invitations created successfully
- ✅ Tenant context properly respected
- ✅ Foreign key references `profiles` table
- ✅ ABZ integration still works
- ✅ All existing functionality intact

---

## Rollback Procedure

If any test fails critically:

1. **Rollback Database**:
   ```sql
   ALTER TABLE user_invitations DROP CONSTRAINT user_invitations_invited_by_fkey;
   ALTER TABLE user_invitations ADD CONSTRAINT user_invitations_invited_by_fkey 
   FOREIGN KEY (invited_by) REFERENCES users_unified(id) ON DELETE CASCADE;
   ```

2. **Rollback Code**:
   ```bash
   git revert <commit-hash>
   ```

3. **Notify Team**: Document the failure and reason for rollback

---

## Post-Deployment Verification

After deploying to production:

1. Monitor error logs for 24 hours
2. Check invitation creation success rate
3. Verify no FK violation errors
4. Confirm ABZ integration still works
5. Review user feedback

---

## Notes

- This fix is backward compatible
- ABZ Group's Painel ABZ integration is maintained
- Future multi-tenant architecture is supported
- All changes follow database best practices

