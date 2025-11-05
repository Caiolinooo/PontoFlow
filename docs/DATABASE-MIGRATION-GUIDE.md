# Database Migration Guide: user_invitations Table

## 🎯 **Objective**
Execute the `user_invitations` table migration to fix the critical database error preventing invitation creation and fetching.

---

## 📋 **Prerequisites**

- Access to Supabase Dashboard
- Project: `Timesheet_Project` (ID: knicakgqydicrvyohcni, Region: us-east-1)
- Admin permissions in Supabase

---

## 🚀 **Method 1: Supabase Dashboard (Recommended)**

### Step 1: Access Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Login with your credentials
3. Select project: **Timesheet_Project**

### Step 2: Open SQL Editor

1. Click on **"SQL Editor"** in the left sidebar
2. Click **"New Query"** button (top right)

### Step 3: Copy Migration SQL

1. Open the file: `web/docs/migrations/user-invitations.sql`
2. Copy the **entire content** of the file (101 lines)
3. Paste into the SQL Editor

### Step 4: Execute Migration

1. Click the **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
2. Wait for execution to complete
3. Check for success message: "Success. No rows returned"

### Step 5: Verify Table Creation

Run this verification query in a new SQL Editor tab:

```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'user_invitations';
```

**Expected Result:** 1 row with `user_invitations`

### Step 6: Verify Indexes

```sql
-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'user_invitations'
ORDER BY indexname;
```

**Expected Result:** 4 indexes:
- `idx_user_invitations_email`
- `idx_user_invitations_invited_by`
- `idx_user_invitations_status`
- `idx_user_invitations_token`

### Step 7: Verify RLS Policies

```sql
-- Check RLS policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_invitations';
```

**Expected Result:** 1 policy:
- `user_invitations_admin_all` (for SELECT, INSERT, UPDATE, DELETE)

### Step 8: Verify Triggers

```sql
-- Check triggers
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'user_invitations';
```

**Expected Result:** 1 trigger:
- `update_user_invitations_updated_at` (BEFORE UPDATE)

---

## 🔧 **Method 2: Supabase CLI (Alternative)**

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Linked to your project

### Step 1: Link Project (if not already linked)

```bash
cd web
supabase link --project-ref knicakgqydicrvyohcni
```

### Step 2: Execute Migration

```bash
# Option A: Using db push
supabase db push --file docs/migrations/user-invitations.sql

# Option B: Using psql directly
supabase db execute --file docs/migrations/user-invitations.sql
```

### Step 3: Verify

```bash
# Check table exists
supabase db execute --query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_invitations';"
```

---

## ✅ **Post-Migration Testing**

### Test 1: Insert Test Invitation

```sql
-- Insert a test invitation
INSERT INTO public.user_invitations (
  email, 
  first_name, 
  last_name, 
  role, 
  token, 
  invited_by
) VALUES (
  'test@example.com', 
  'Test', 
  'User', 
  'USER', 
  gen_random_uuid()::text, 
  'e7edafc8-f993-400b-ada9-4eeea17ee9cc'  -- Your user ID
);

-- Verify insertion
SELECT id, email, first_name, last_name, role, status, invited_at
FROM public.user_invitations 
WHERE email = 'test@example.com';

-- Clean up test data
DELETE FROM public.user_invitations WHERE email = 'test@example.com';
```

### Test 2: Test Foreign Key Relationship

```sql
-- Test join with users_unified
SELECT 
  ui.id,
  ui.email,
  ui.first_name,
  ui.last_name,
  ui.role,
  ui.status,
  uu.email as invited_by_email,
  uu.first_name as invited_by_first_name,
  uu.last_name as invited_by_last_name
FROM public.user_invitations ui
LEFT JOIN public.users_unified uu ON ui.invited_by = uu.id
LIMIT 5;
```

### Test 3: Test RLS Policies

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_invitations';

-- Should return: rowsecurity = true
```

---

## 🐛 **Troubleshooting**

### Error: "relation already exists"

**Cause:** Table was already created in a previous attempt.

**Solution:**
```sql
-- Check if table exists
SELECT * FROM public.user_invitations LIMIT 1;

-- If it exists and has correct structure, no action needed
-- If it exists but has wrong structure, drop and recreate:
DROP TABLE IF EXISTS public.user_invitations CASCADE;
-- Then re-run the migration
```

### Error: "permission denied"

**Cause:** Insufficient permissions.

**Solution:**
- Ensure you're logged in as the project owner
- Check that you have admin access to the Supabase project

### Error: "foreign key constraint violation"

**Cause:** The `users_unified` table doesn't exist or the referenced user ID doesn't exist.

**Solution:**
```sql
-- Check if users_unified table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'users_unified';

-- Check if your user ID exists
SELECT id, email FROM public.users_unified 
WHERE id = 'e7edafc8-f993-400b-ada9-4eeea17ee9cc';
```

---

## 📊 **Expected Database Schema**

After successful migration, the `user_invitations` table should have:

### Columns (20 total)
- `id` (UUID, PRIMARY KEY)
- `email` (TEXT, NOT NULL)
- `first_name` (TEXT, NOT NULL)
- `last_name` (TEXT, NOT NULL)
- `phone_number` (TEXT)
- `position` (TEXT)
- `department` (TEXT)
- `role` (TEXT, NOT NULL, CHECK constraint)
- `token` (TEXT, NOT NULL, UNIQUE)
- `invited_by` (UUID, NOT NULL, FOREIGN KEY → users_unified.id)
- `invited_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `expires_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW() + 7 days)
- `status` (TEXT, NOT NULL, DEFAULT 'pending', CHECK constraint)
- `accepted_at` (TIMESTAMPTZ)
- `tenant_ids` (UUID[], DEFAULT '{}')
- `group_ids` (UUID[], DEFAULT '{}')
- `managed_group_ids` (UUID[], DEFAULT '{}')
- `metadata` (JSONB, DEFAULT '{}')
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

### Indexes (4 total)
- `idx_user_invitations_email` (email)
- `idx_user_invitations_token` (token)
- `idx_user_invitations_status` (status)
- `idx_user_invitations_invited_by` (invited_by)

### RLS Policies (1 total)
- `user_invitations_admin_all` - Admins can perform all operations

### Triggers (1 total)
- `update_user_invitations_updated_at` - Auto-update `updated_at` on row update

---

## 🎉 **Success Indicators**

After successful migration, you should be able to:

1. ✅ Create invitations via POST `/api/admin/invitations`
2. ✅ Fetch invitations via GET `/api/admin/invitations`
3. ✅ See invited_by user data in invitation responses
4. ✅ No more "relation does not exist" errors in logs
5. ✅ Invitation modal works without database errors

---

## 📝 **Next Steps After Migration**

1. **Test API Endpoints**
   - Test GET `/api/admin/invitations?status=pending`
   - Test POST `/api/admin/invitations` with sample data

2. **Test UI**
   - Open invitation modal in admin interface
   - Create a test invitation
   - Verify invitation appears in "Manage Invitations" tab

3. **Monitor Logs**
   - Check browser console for errors
   - Check Supabase logs for database errors

4. **Clean Up**
   - Remove any test invitations created during testing

---

**Migration Status:** ⏳ Pending Execution
**Priority:** 🔴 CRITICAL
**Estimated Time:** 5-10 minutes

