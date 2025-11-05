# 🔄 Complete User Sync Solution - ABZ Group

**Date:** 2025-11-05  
**Status:** 🚀 **READY TO DEPLOY**  
**Estimated Time:** 5 minutes

---

## 🎯 Solution Overview

This solution implements **automatic user synchronization** across all three user tables:

```
auth.users (Supabase Auth)
    ↓ [TRIGGER 1] ✅ UNIVERSAL
profiles (User profiles)
    ↓ [TRIGGER 2] ⚙️ ABZ ONLY
users_unified (Legacy ABZ Painel)
```

### **Key Features:**

1. ✅ **Automatic Sync:** New users are automatically synced across tables
2. ⚙️ **Configurable:** ABZ-specific sync can be enabled/disabled
3. 🌍 **Future-Proof:** Works for both ABZ and future clients
4. 🔒 **Safe:** Uses database triggers (no code changes needed)
5. 🔄 **Backfill:** Syncs existing users on installation

---

## 📋 Migration Scripts

### **Script 1: Auth → Profiles Sync (UNIVERSAL)** ⭐

**File:** `SYNC-AUTH-USERS-TO-PROFILES-TRIGGER.sql`

**Purpose:** Automatically sync all authenticated users to profiles table

**Scope:** **ALL CLIENTS** (ABZ + Future clients)

**What it does:**
- Creates trigger `on_auth_user_created` on `auth.users`
- Automatically creates profile when user signs up
- Backfills existing auth.users to profiles
- **REQUIRED** for the system to work

---

### **Script 2: Profiles → Users_Unified Sync (ABZ ONLY)** 🏢

**File:** `SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-ABZ.sql`

**Purpose:** Sync profiles to users_unified for Painel ABZ integration

**Scope:** **ABZ GROUP ONLY**

**What it does:**
- Creates trigger `on_profile_sync_to_users_unified` on `profiles`
- Automatically syncs profiles to users_unified
- Backfills existing profiles to users_unified
- **OPTIONAL** - Only for ABZ Group

---

### **Script 3: Fix Invitations FK (REQUIRED)** 🔧

**File:** `FIX-USER-INVITATIONS-FK-TO-PROFILES.sql`

**Purpose:** Change foreign key from users_unified to profiles

**Scope:** **ALL CLIENTS**

**What it does:**
- Changes `invited_by` FK from `users_unified(id)` to `profiles(user_id)`
- Fixes foreign key constraint error
- **REQUIRED** for invitations to work

---

## 🚀 Execution Order

### **For ABZ Group (Current Setup):**

Execute in this order:

1. ✅ **SYNC-AUTH-USERS-TO-PROFILES-TRIGGER.sql** (Universal)
2. ✅ **SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-ABZ.sql** (ABZ specific)
3. ✅ **FIX-USER-INVITATIONS-FK-TO-PROFILES.sql** (Fix invitations)

### **For Future Clients:**

Execute only:

1. ✅ **SYNC-AUTH-USERS-TO-PROFILES-TRIGGER.sql** (Universal)
2. ✅ **FIX-USER-INVITATIONS-FK-TO-PROFILES.sql** (Fix invitations)
3. ❌ **SKIP** SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-ABZ.sql

---

## 📝 Step-by-Step Execution

### **Step 1: Open Supabase SQL Editor**

1. Go to: https://supabase.com/dashboard
2. Select project: **Timesheet_Project**
3. Click **"SQL Editor"** in the left sidebar

---

### **Step 2: Execute Script 1 (Universal Sync)**

1. Click **"New query"**
2. Open file: `web/migrations/SYNC-AUTH-USERS-TO-PROFILES-TRIGGER.sql`
3. **Copy entire content**
4. **Paste into SQL Editor**
5. Click **"Run"** or press **Ctrl+Enter**

**Expected Output:**
```
✅ Trigger "on_auth_user_created" created successfully
=== ✅ SYNC TRIGGER INSTALLED ===
auth.users count: 21
profiles count: 21
✅ All future users will be automatically synced to profiles!
```

---

### **Step 3: Execute Script 2 (ABZ Sync)**

1. Click **"New query"**
2. Open file: `web/migrations/SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-ABZ.sql`
3. **Copy entire content**
4. **Paste into SQL Editor**
5. Click **"Run"** or press **Ctrl+Enter**

**Expected Output:**
```
✅ Trigger "on_profile_sync_to_users_unified" created successfully
=== ✅ ABZ SYNC TRIGGER INSTALLED ===
profiles count: 21
users_unified count: 21
✅ All future profiles will be automatically synced to users_unified!
```

---

### **Step 4: Execute Script 3 (Fix Invitations)**

1. Click **"New query"**
2. Open file: `web/migrations/FIX-USER-INVITATIONS-FK-TO-PROFILES.sql`
3. **Copy entire content**
4. **Paste into SQL Editor**
5. Click **"Run"** or press **Ctrl+Enter**

**Expected Output:**
```
✅ Dropped old foreign key constraint: user_invitations_invited_by_fkey
✅ New foreign key constraint created successfully
=== ✅ MIGRATION COMPLETE ===
OLD: invited_by → users_unified(id)
NEW: invited_by → profiles(user_id)
```

---

## ✅ Verification

After executing all scripts, verify the setup:

```sql
-- Check triggers
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname IN ('on_auth_user_created', 'on_profile_sync_to_users_unified');

-- Check FK constraint
SELECT 
  conname as constraint_name,
  confrelid::regclass as referenced_table
FROM pg_constraint 
WHERE conname = 'user_invitations_invited_by_fkey';

-- Check sync status
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users,
  (SELECT COUNT(*) FROM profiles) as profiles,
  (SELECT COUNT(*) FROM users_unified) as users_unified;
```

**Expected Results:**
- ✅ 2 triggers created
- ✅ FK references `profiles` table
- ✅ All counts should match (21 users in all tables)

---

## 🧪 Testing

### **Test 1: Create New User via Supabase Auth**

```sql
-- This will be done via your app's signup, but you can test manually:
-- 1. Go to your app's signup page
-- 2. Create a new user
-- 3. Check if user appears in all 3 tables
```

### **Test 2: Create User Invitation**

1. **Reload your application** (Ctrl+Shift+R)
2. Go to **Admin → Users**
3. Click **"Gerenciar Convites"**
4. Fill in the form
5. Click **"Enviar Convite"**
6. **Expected:** ✅ Invitation created successfully (no FK error)

---

## 🔧 Disabling ABZ Sync (For Future Clients)

If you need to disable the ABZ-specific sync for a future client:

```sql
-- Disable the trigger
DROP TRIGGER IF EXISTS on_profile_sync_to_users_unified ON profiles;

-- Optionally, drop the function
DROP FUNCTION IF EXISTS public.sync_profile_to_users_unified();

-- Optionally, drop the users_unified table
DROP TABLE IF EXISTS public.users_unified CASCADE;
```

---

## 📊 Architecture Comparison

### **Before (Manual Sync):**
```
auth.users (21 users)
    ↓ manual code
profiles (4 users) ❌ Missing 17 users!
    ↓ manual code
users_unified (8 users) ❌ Missing 13 users!
```

### **After (Automatic Sync):**
```
auth.users (21 users)
    ↓ TRIGGER ✅
profiles (21 users) ✅ All synced!
    ↓ TRIGGER ✅
users_unified (21 users) ✅ All synced!
```

---

## ⚠️ Important Notes

1. **Triggers are permanent:** Once installed, they run automatically
2. **No code changes needed:** Everything happens at database level
3. **Safe to run multiple times:** Scripts use `CREATE OR REPLACE` and `ON CONFLICT`
4. **Backfill included:** Existing users are synced on installation
5. **Future-proof:** ABZ sync can be disabled for future clients

---

## 🆘 Troubleshooting

### Issue: "permission denied for table auth.users"
**Solution:** Make sure you're using the service role key in Supabase SQL Editor

### Issue: "trigger already exists"
**Solution:** The script handles this automatically with `DROP TRIGGER IF EXISTS`

### Issue: Still getting FK error after Script 3
**Solution:** Verify the FK was changed:
```sql
SELECT confrelid::regclass 
FROM pg_constraint 
WHERE conname = 'user_invitations_invited_by_fkey';
-- Should return: profiles
```

---

**Ready to execute? Start with Script 1!** 🚀

