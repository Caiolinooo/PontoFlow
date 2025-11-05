# Test Plan: User Invitation Fixes

## Prerequisites
- User: `caio.correia@groupabz.com`
- User ID: `e7edafc8-f993-400b-ada9-4eeea17ee9cc`
- Global Role: `ADMIN`
- Selected Tenant: `2376edb6-bcda-47f6-a0c7-cecd701298ca`

---

## Test 1: Create Invitation with USER Role

### Steps:
1. Login to the application as `caio.correia@groupabz.com`
2. Navigate to the Users/Invitations page
3. Click "Create Invitation" or "Invite User"
4. Fill in the form:
   - Email: `test.user@example.com`
   - First Name: `Test`
   - Last Name: `User`
   - Role: `USER`
5. Submit the form

### Expected Results:
- ✅ No RLS policy violation error
- ✅ Invitation created successfully
- ✅ Invitation automatically assigned to tenant `2376edb6-bcda-47f6-a0c7-cecd701298ca`
- ✅ Success message displayed
- ✅ Invitation appears in the list

### Console Logs to Check:
```
✅ [Auth] User authenticated: caio.correia@groupabz.com Role: ADMIN
✅ [Auth] User tenant_id: 2376edb6-bcda-47f6-a0c7-cecd701298ca
🔧 [Tenant Context] Auto-assigning selected tenant: 2376edb6-bcda-47f6-a0c7-cecd701298ca
✅ [Validation] Tenant IDs validated: ["2376edb6-bcda-47f6-a0c7-cecd701298ca"]
💾 [Database] Creating invitation with data: { tenant_ids: ["2376edb6-bcda-47f6-a0c7-cecd701298ca"], ... }
✅ [Database] Invitation created successfully: <invitation-id>
```

---

## Test 2: Create Invitation with MANAGER Role

### Steps:
1. Login to the application as `caio.correia@groupabz.com`
2. Navigate to the Users/Invitations page
3. Click "Create Invitation" or "Invite User"
4. Fill in the form:
   - Email: `test.manager@example.com`
   - First Name: `Test`
   - Last Name: `Manager`
   - Role: `MANAGER` or `GERENTE`
5. Submit the form

### Expected Results:
- ✅ No tenant selection prompt appears
- ✅ No RLS policy violation error
- ✅ Invitation created successfully
- ✅ Invitation automatically assigned to tenant `2376edb6-bcda-47f6-a0c7-cecd701298ca`
- ✅ Success message displayed

### Console Logs to Check:
```
✅ [Auth] User authenticated: caio.correia@groupabz.com Role: ADMIN
🔧 [Tenant Context] Auto-assigning selected tenant: 2376edb6-bcda-47f6-a0c7-cecd701298ca
✅ [Database] Invitation created successfully
```

---

## Test 3: Create Invitation with Explicit Tenant Selection

### Steps:
1. Login to the application as `caio.correia@groupabz.com`
2. Navigate to the Users/Invitations page
3. Click "Create Invitation" or "Invite User"
4. Fill in the form:
   - Email: `test.explicit@example.com`
   - First Name: `Test`
   - Last Name: `Explicit`
   - Role: `USER`
   - Manually select tenant: `1c89cfe8-b7c3-4c67-9a9f-d204f0d62280` (the other tenant)
5. Submit the form

### Expected Results:
- ✅ No RLS policy violation error
- ✅ Invitation created successfully
- ✅ Invitation assigned to the explicitly selected tenant `1c89cfe8-b7c3-4c67-9a9f-d204f0d62280`
- ✅ Success message displayed

### Console Logs to Check:
```
✅ [Auth] User authenticated: caio.correia@groupabz.com Role: ADMIN
✅ [Validation] Tenant IDs validated: ["1c89cfe8-b7c3-4c67-9a9f-d204f0d62280"]
💾 [Database] Creating invitation with data: { tenant_ids: ["1c89cfe8-b7c3-4c67-9a9f-d204f0d62280"], ... }
✅ [Database] Invitation created successfully
```

---

## Test 4: Verify RLS Policy

### Steps:
1. Open browser developer tools
2. Go to Network tab
3. Create an invitation as in Test 1
4. Check the API response

### Expected Results:
- ✅ HTTP Status: 200 OK
- ✅ Response body contains `{ success: true, invitation: { ... } }`
- ✅ No error code `42501` (RLS violation)

---

## Test 5: Verify Database Records

### Steps:
1. After creating invitations in Tests 1-3
2. Query the database:
   ```sql
   SELECT id, email, role, status, tenant_ids, invited_by 
   FROM user_invitations 
   WHERE invited_by = 'e7edafc8-f993-400b-ada9-4eeea17ee9cc'
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

### Expected Results:
- ✅ All invitations are visible
- ✅ `tenant_ids` arrays contain the correct tenant IDs
- ✅ `invited_by` is `e7edafc8-f993-400b-ada9-4eeea17ee9cc`
- ✅ `status` is `pending`

---

## Troubleshooting

### If RLS Error Still Occurs:
1. Check that `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
2. Verify the RLS policy was updated:
   ```sql
   SELECT policyname, qual FROM pg_policies WHERE tablename = 'user_invitations';
   ```
3. Check server logs for detailed error messages

### If Tenant Not Auto-Assigned:
1. Check that `currentUser.tenant_id` is set correctly
2. Verify the tenant context resolution in auth logs
3. Check that the frontend is not sending an empty `tenant_ids` array

### If Frontend Shows Tenant Selection:
1. This is expected behavior - users can still manually select tenants
2. The fix ensures that if no tenant is selected, the current tenant is used automatically
3. The frontend pre-selects the current tenant by default

---

## Success Criteria

All tests pass with:
- ✅ No RLS policy violations (error code 42501)
- ✅ Invitations created successfully
- ✅ Tenant context properly respected
- ✅ Automatic tenant assignment works
- ✅ Manual tenant selection still works
- ✅ All roles (USER, MANAGER, ADMIN) work correctly

