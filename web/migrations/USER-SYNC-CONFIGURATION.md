# 🔄 User Sync Configuration Guide

**Purpose:** Configure automatic user synchronization for different client types  
**Date:** 2025-11-05

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE AUTH                            │
│                     auth.users                              │
│              (PRIMARY SOURCE OF TRUTH)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ [TRIGGER 1] ✅ UNIVERSAL
                       │ on_auth_user_created
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                   USER PROFILES                             │
│                     profiles                                │
│              (UNIVERSAL - ALL CLIENTS)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ [TRIGGER 2] ⚙️ ABZ ONLY
                       │ on_profile_sync_to_users_unified
                       │ (OPTIONAL - CONFIGURABLE)
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  LEGACY ABZ TABLE                           │
│                  users_unified                              │
│         (ABZ GROUP ONLY - PAINEL ABZ INTEGRATION)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Configuration Scenarios

### **Scenario 1: ABZ Group (Current Setup)**

**Requirements:**
- ✅ Supabase Auth (auth.users)
- ✅ User Profiles (profiles)
- ✅ Legacy ABZ Integration (users_unified)
- ✅ Painel ABZ sync required

**Configuration:**
```
TRIGGER 1: ✅ ENABLED (auth.users → profiles)
TRIGGER 2: ✅ ENABLED (profiles → users_unified)
```

**Scripts to Execute:**
1. ✅ `SYNC-AUTH-USERS-TO-PROFILES-TRIGGER.sql`
2. ✅ `SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-ABZ.sql`
3. ✅ `FIX-USER-INVITATIONS-FK-TO-PROFILES.sql`

---

### **Scenario 2: Future Client (Standard Setup)**

**Requirements:**
- ✅ Supabase Auth (auth.users)
- ✅ User Profiles (profiles)
- ❌ No legacy integration needed
- ❌ No users_unified table

**Configuration:**
```
TRIGGER 1: ✅ ENABLED (auth.users → profiles)
TRIGGER 2: ❌ DISABLED (no users_unified sync)
```

**Scripts to Execute:**
1. ✅ `SYNC-AUTH-USERS-TO-PROFILES-TRIGGER.sql`
2. ❌ SKIP `SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-ABZ.sql`
3. ✅ `FIX-USER-INVITATIONS-FK-TO-PROFILES.sql`

---

### **Scenario 3: Migrating ABZ to Standard Setup**

**Requirements:**
- Transition from ABZ-specific to standard setup
- Remove dependency on users_unified
- Maintain existing user data

**Configuration:**
```
TRIGGER 1: ✅ ENABLED (auth.users → profiles)
TRIGGER 2: ❌ DISABLED (remove ABZ sync)
```

**Scripts to Execute:**
1. ✅ `DISABLE-ABZ-SYNC-FOR-FUTURE-CLIENTS.sql`
2. ✅ Verify all users exist in profiles
3. ✅ Optionally drop users_unified table

---

## 📋 Trigger Management

### **Check Current Triggers**

```sql
-- List all user sync triggers
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname IN (
  'on_auth_user_created',
  'on_profile_sync_to_users_unified'
)
ORDER BY tgname;
```

**Expected Output (ABZ Setup):**
```
trigger_name                      | table_name | enabled | function_name
----------------------------------|------------|---------|---------------------------
on_auth_user_created              | auth.users | O       | handle_new_user
on_profile_sync_to_users_unified  | profiles   | O       | sync_profile_to_users_unified
```

**Expected Output (Standard Setup):**
```
trigger_name                      | table_name | enabled | function_name
----------------------------------|------------|---------|---------------------------
on_auth_user_created              | auth.users | O       | handle_new_user
```

---

### **Enable ABZ Sync**

```sql
-- Run this script to enable ABZ sync
\i SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-ABZ.sql
```

---

### **Disable ABZ Sync**

```sql
-- Run this script to disable ABZ sync
\i DISABLE-ABZ-SYNC-FOR-FUTURE-CLIENTS.sql
```

---

## 🔍 Verification Queries

### **Check Sync Status**

```sql
-- Compare record counts across tables
SELECT 
  'auth.users' as table_name,
  COUNT(*) as record_count
FROM auth.users
UNION ALL
SELECT 
  'profiles' as table_name,
  COUNT(*) as record_count
FROM public.profiles
UNION ALL
SELECT 
  'users_unified' as table_name,
  COUNT(*) as record_count
FROM public.users_unified
ORDER BY table_name;
```

**Expected Output (ABZ Setup - All Synced):**
```
table_name     | record_count
---------------|-------------
auth.users     | 21
profiles       | 21
users_unified  | 21
```

**Expected Output (Standard Setup):**
```
table_name     | record_count
---------------|-------------
auth.users     | 21
profiles       | 21
users_unified  | 0 (or table doesn't exist)
```

---

### **Find Unsynced Users**

```sql
-- Find users in auth.users but not in profiles
SELECT 
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL;

-- Find users in profiles but not in users_unified (ABZ only)
SELECT 
  p.user_id,
  p.email,
  p.created_at
FROM public.profiles p
LEFT JOIN public.users_unified u ON u.id = p.user_id
WHERE u.id IS NULL;
```

---

## 🛠️ Manual Sync (If Needed)

### **Sync auth.users → profiles**

```sql
INSERT INTO public.profiles (
  user_id, display_name, email, phone, ativo, locale, created_at
)
SELECT 
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'display_name',
    split_part(au.email, '@', 1)
  ),
  au.email,
  au.raw_user_meta_data->>'phone',
  true,
  COALESCE(au.raw_user_meta_data->>'locale', 'pt-BR'),
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = au.id
)
ON CONFLICT (user_id) DO NOTHING;
```

---

### **Sync profiles → users_unified (ABZ only)**

```sql
INSERT INTO public.users_unified (
  id, email, first_name, last_name, phone_number, role, active, 
  email_verified, failed_login_attempts, created_at, updated_at
)
SELECT 
  p.user_id,
  p.email,
  split_part(p.display_name, ' ', 1),
  split_part(p.display_name, ' ', 2),
  p.phone,
  'USER',
  p.ativo,
  true,
  0,
  p.created_at,
  NOW()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.users_unified u WHERE u.id = p.user_id
)
ON CONFLICT (id) DO NOTHING;
```

---

## 📊 Configuration Matrix

| Feature | ABZ Setup | Standard Setup |
|---------|-----------|----------------|
| **auth.users** | ✅ Required | ✅ Required |
| **profiles** | ✅ Required | ✅ Required |
| **users_unified** | ✅ Required | ❌ Not needed |
| **Trigger 1** | ✅ Enabled | ✅ Enabled |
| **Trigger 2** | ✅ Enabled | ❌ Disabled |
| **Painel ABZ** | ✅ Integrated | ❌ Not integrated |
| **FK Target** | profiles | profiles |

---

## 🚀 Quick Start Commands

### **For ABZ Group:**
```bash
# Execute all 3 scripts in order
psql -f SYNC-AUTH-USERS-TO-PROFILES-TRIGGER.sql
psql -f SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-ABZ.sql
psql -f FIX-USER-INVITATIONS-FK-TO-PROFILES.sql
```

### **For Future Clients:**
```bash
# Execute only 2 scripts
psql -f SYNC-AUTH-USERS-TO-PROFILES-TRIGGER.sql
psql -f FIX-USER-INVITATIONS-FK-TO-PROFILES.sql
```

### **To Disable ABZ Sync:**
```bash
# Execute disable script
psql -f DISABLE-ABZ-SYNC-FOR-FUTURE-CLIENTS.sql
```

---

## 📞 Support

For questions or issues:
1. Check trigger status with verification queries
2. Review sync status with count queries
3. Check for unsynced users
4. Run manual sync if needed

---

**Configuration complete! Choose your scenario and execute the appropriate scripts.** 🎉

