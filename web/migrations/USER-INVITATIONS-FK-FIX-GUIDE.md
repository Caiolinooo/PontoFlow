# 🔧 User Invitations Foreign Key Fix Guide

**Date:** 2025-11-05  
**Status:** 🚨 **URGENT - BLOCKING INVITATIONS**  
**Estimated Time:** 2 minutes

---

## 🎯 Problem Summary

**Error:**
```
insert or update on table "user_invitations" violates foreign key constraint "user_invitations_invited_by_fkey"
Key (invited_by)=(e7edafc8-f993-400b-ada9-4eeea17ee9cc) is not present in table "users_unified".
```

**Root Cause:**
- The `user_invitations.invited_by` field has a foreign key constraint to `users_unified(id)`
- Your current user exists in `auth.users` and `profiles`, but NOT in `users_unified`
- `users_unified` is a legacy table used only for ABZ Group's Painel ABZ integration
- Not all users are synced to `users_unified`, causing the FK constraint to fail

**Impact:**
- ❌ Cannot create user invitations
- ❌ Blocks admin functionality
- ✅ Does not affect existing data

---

## 🔍 Step 1: Diagnose (Optional)

Run this script to confirm the issue:

**File:** `web/migrations/DIAGNOSE-USER-INVITATIONS-FK.sql`

```bash
# In Supabase SQL Editor:
1. Open the file DIAGNOSE-USER-INVITATIONS-FK.sql
2. Replace 'e7edafc8-f993-400b-ada9-4eeea17ee9cc' with your actual user ID (if different)
3. Execute the script
4. Review the diagnostic report
```

**Expected Output:**
- ✅ User EXISTS in auth.users
- ✅ User EXISTS in profiles
- ❌ User NOT FOUND in users_unified ← **This is the problem**

---

## ✅ Step 2: Fix (REQUIRED)

Run this script to fix the foreign key constraint:

**File:** `web/migrations/FIX-USER-INVITATIONS-FK-TO-PROFILES.sql`

### Execution Steps:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select project: **Timesheet_Project**

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Execute**
   - Open `web/migrations/FIX-USER-INVITATIONS-FK-TO-PROFILES.sql`
   - Copy the entire content
   - Paste into SQL Editor
   - Click "Run" or press Ctrl+Enter

4. **Verify Success**
   - Look for: `✅ MIGRATION COMPLETE`
   - Check the verification output shows:
     ```
     constraint_name: user_invitations_invited_by_fkey
     referenced_table: profiles
     ```

---

## 🎯 What This Fix Does

### Before:
```sql
invited_by UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE
```
- ❌ Only works for users in `users_unified` (legacy table)
- ❌ Fails for users authenticated via Supabase Auth

### After:
```sql
invited_by UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE
```
- ✅ Works for ALL authenticated users
- ✅ `profiles` table is synced with `auth.users`
- ✅ Universal solution for current and future users

---

## 🧪 Step 3: Test

After running the fix:

1. **Reload your application** (Ctrl+Shift+R)
2. **Try creating a user invitation**:
   - Go to Admin → Users
   - Click "Gerenciar Convites"
   - Fill in the form
   - Click "Enviar Convite"
3. **Expected Result:** ✅ Invitation created successfully

---

## 📊 Technical Details

### Database Architecture

```
auth.users (Supabase Auth - 21 users)
    ↓ synced via trigger
profiles (User profiles - 21 users) ← NEW FK TARGET
    ↓ optional sync
users_unified (Legacy ABZ Painel - 8 users) ← OLD FK TARGET
```

### Why This Fix is Better

1. **Universal:** Works for all users, not just ABZ Group users
2. **Future-proof:** New users automatically get profiles
3. **Consistent:** Aligns with Supabase Auth architecture
4. **Safe:** No data loss, only constraint change

---

## ⚠️ Important Notes

- **No data loss:** This only changes the FK constraint, doesn't delete anything
- **Backwards compatible:** Existing invitations remain unchanged
- **Safe to run:** Uses `BEGIN/COMMIT` transaction for safety
- **Idempotent:** Can be run multiple times safely

---

## 🆘 Troubleshooting

### Issue: "constraint does not exist"
**Solution:** The constraint might have a different name. Check with:
```sql
SELECT conname FROM pg_constraint 
WHERE conrelid = 'user_invitations'::regclass AND contype = 'f';
```

### Issue: "profiles table not found"
**Solution:** Ensure profiles table exists:
```sql
SELECT * FROM profiles LIMIT 1;
```

### Issue: Still getting FK error after fix
**Solution:** 
1. Verify the fix was applied:
   ```sql
   SELECT confrelid::regclass 
   FROM pg_constraint 
   WHERE conname = 'user_invitations_invited_by_fkey';
   ```
   Should return: `profiles`

2. Check if your user exists in profiles:
   ```sql
   SELECT * FROM profiles WHERE user_id = 'YOUR_USER_ID';
   ```

---

## 📞 Need Help?

If you encounter any issues:
1. Share the error message from the SQL Editor
2. Share the output of the DIAGNOSE script
3. Confirm which step failed

---

**Ready to fix? Execute `FIX-USER-INVITATIONS-FK-TO-PROFILES.sql` now!** 🚀

