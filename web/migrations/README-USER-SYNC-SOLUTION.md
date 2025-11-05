# 🔄 User Sync Solution - Complete Guide

**Date:** 2025-11-05  
**Status:** 🚀 **READY TO DEPLOY**  
**Priority:** 🔴 **CRITICAL** - Fixes foreign key constraint error

---

## 🎯 What This Solves

### **Problem:**
```
ERROR: insert or update on table "user_invitations" violates foreign key constraint
Key (invited_by)=(e7edafc8-f993-400b-ada9-4eeea17ee9cc) is not present in table "users_unified"
```

### **Root Cause:**
- User exists in `auth.users` and `profiles`
- User does NOT exist in `users_unified` (legacy ABZ table)
- Foreign key constraint references `users_unified` instead of `profiles`
- No automatic sync between tables

### **Solution:**
1. ✅ Create automatic sync triggers (auth.users → profiles → users_unified)
2. ✅ Change FK constraint to reference `profiles` instead of `users_unified`
3. ✅ Backfill existing users
4. ✅ Make ABZ sync configurable for future clients

---

## 📋 Files in This Solution

| File | Purpose | Required For |
|------|---------|--------------|
| **COMPLETE-USER-SYNC-SOLUTION-GUIDE.md** | 📖 Main guide | **START HERE** |
| `SYNC-AUTH-USERS-TO-PROFILES-TRIGGER.sql` | Universal sync | ALL CLIENTS |
| `SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-ABZ.sql` | ABZ sync | ABZ ONLY |
| `FIX-USER-INVITATIONS-FK-TO-PROFILES.sql` | Fix FK | ALL CLIENTS |
| `DISABLE-ABZ-SYNC-FOR-FUTURE-CLIENTS.sql` | Disable ABZ | FUTURE CLIENTS |
| `USER-SYNC-CONFIGURATION.md` | Configuration | REFERENCE |
| `DIAGNOSE-USER-INVITATIONS-FK.sql` | Diagnostic | TROUBLESHOOTING |

---

## 🚀 Quick Start (ABZ Group)

### **Step 1: Read the Guide**
Open and read: `COMPLETE-USER-SYNC-SOLUTION-GUIDE.md`

### **Step 2: Execute Scripts in Order**

1. **SYNC-AUTH-USERS-TO-PROFILES-TRIGGER.sql**
   - Creates trigger: `on_auth_user_created`
   - Syncs: auth.users → profiles
   - Scope: UNIVERSAL (all clients)

2. **SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-ABZ.sql**
   - Creates trigger: `on_profile_sync_to_users_unified`
   - Syncs: profiles → users_unified
   - Scope: ABZ ONLY

3. **FIX-USER-INVITATIONS-FK-TO-PROFILES.sql**
   - Changes FK: users_unified → profiles
   - Fixes: Invitation creation error
   - Scope: UNIVERSAL (all clients)

### **Step 3: Verify**
- Check all users are synced
- Test invitation creation
- Verify no FK errors

**Estimated Time:** 5 minutes

---

## 🏗️ Architecture

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
    ↓ TRIGGER ✅ on_auth_user_created
profiles (21 users) ✅ All synced!
    ↓ TRIGGER ✅ on_profile_sync_to_users_unified
users_unified (21 users) ✅ All synced!
```

---

## ✅ Benefits

1. **Fixes FK Error:** Invitations work without constraint errors
2. **Automatic Sync:** No manual intervention needed
3. **Configurable:** ABZ sync can be disabled for future clients
4. **Backfill:** Existing users are synced on installation
5. **Safe:** Uses transactions, idempotent, no data loss
6. **Future-Proof:** Works for both ABZ and future clients

---

## 🎯 For Future Clients

If you're setting up for a future client (not ABZ):

1. ✅ Execute: `SYNC-AUTH-USERS-TO-PROFILES-TRIGGER.sql`
2. ❌ SKIP: `SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-ABZ.sql`
3. ✅ Execute: `FIX-USER-INVITATIONS-FK-TO-PROFILES.sql`

**Result:** System works without `users_unified` table

---

## 🔍 Verification

After executing all scripts:

```sql
-- Check triggers
SELECT tgname, tgrelid::regclass, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname IN ('on_auth_user_created', 'on_profile_sync_to_users_unified');

-- Check FK
SELECT conname, confrelid::regclass
FROM pg_constraint 
WHERE conname = 'user_invitations_invited_by_fkey';

-- Check sync status
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users,
  (SELECT COUNT(*) FROM profiles) as profiles,
  (SELECT COUNT(*) FROM users_unified) as users_unified;
```

**Expected:**
- ✅ 2 triggers created
- ✅ FK references `profiles`
- ✅ All counts match (21 users)

---

## 🧪 Testing

1. **Reload application** (Ctrl+Shift+R)
2. **Go to Admin → Users**
3. **Click "Gerenciar Convites"**
4. **Fill form and submit**
5. **Expected:** ✅ Invitation created successfully

---

## 🆘 Troubleshooting

### **Still getting FK error?**
Run: `DIAGNOSE-USER-INVITATIONS-FK.sql`

### **Triggers not working?**
Check: `USER-SYNC-CONFIGURATION.md`

### **Users not syncing?**
Run manual sync queries in configuration guide

---

## 📊 Status

| Component | Status | Notes |
|-----------|--------|-------|
| Trigger 1 (Universal) | ⏳ Pending | auth.users → profiles |
| Trigger 2 (ABZ) | ⏳ Pending | profiles → users_unified |
| FK Fix | ⏳ Pending | Change to profiles |
| Testing | ⏳ Pending | Verify invitations work |

---

## 📞 Next Steps

1. ⏳ Execute the 3 scripts in order
2. ⏳ Verify sync status
3. ⏳ Test invitation creation
4. ⏳ Confirm no FK errors
5. ✅ Mark as complete

---

**Ready to start? Open `COMPLETE-USER-SYNC-SOLUTION-GUIDE.md`!** 🚀

