# Configuration System Quick Fixes

## Critical Fixes Applied ✅

### 1. Environment Configuration Fixed
**File:** `web/.env.local`
**Issue:** Invalid Supabase URL and Anon Key
**Fix:** Corrected to proper Supabase endpoint and anon key
**Status:** ✅ COMPLETED

## Remaining Issues & Fixes 🔧

### 1. Build Module Resolution Issue

**Problem:**
```
Cannot find module './vendor-chunks/@supabase.js'
```

**Quick Fix Steps:**
```bash
# Navigate to web directory
cd web

# Clear Next.js build cache
rm -rf .next
rm -rf node_modules/.cache

# Reinstall dependencies
npm install

# Restart development server
npm run dev
```

### 2. Dependency Verification

**Check if required packages are installed:**
```bash
# Verify nodemailer (for email testing)
npm list nodemailer

# Verify @supabase packages
npm list @supabase/supabase-js
```

**If missing, install:**
```bash
npm install nodemailer @supabase/supabase-js
```

### 3. API Testing After Environment Fix

**Test the health endpoint (requires ADMIN auth):**
```bash
# Use curl with proper authentication
curl -X GET "http://localhost:3000/api/admin/health" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Test notification preferences:**
```bash
curl -X GET "http://localhost:3000/api/notifications/preferences" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json"
```

### 4. Configuration Persistence Testing

**Test tenant settings save:**
1. Access: `http://localhost:3000/pt-BR/admin/settings`
2. Navigate to "Tenant" tab
3. Update company name
4. Click "Save"
5. Verify the change is saved to database

### 5. Email Configuration Testing

**Test email configuration:**
1. Access: `http://localhost:3000/pt-BR/admin/settings`
2. Navigate to "System" tab → "Email" sub-tab
3. Configure SMTP settings
4. Click "🧪 Test Configuration"
5. Verify test results

## Configuration Features Validation Checklist

### Admin Settings (`/admin/settings`)

- [ ] **Health Tab**
  - [ ] Database connectivity shows ✅
  - [ ] Tables exist status visible
  - [ ] Service connection working

- [ ] **System Tab**
  - [ ] Database configuration form works
  - [ ] Email configuration saves
  - [ ] Email test button functional
  - [ ] Sync configuration accessible
  - [ ] Migration tools available
  - [ ] Endpoints configuration works

- [ ] **Tenant Tab**
  - [ ] Company info form saves
  - [ ] Address information saves
  - [ ] Logo upload works (file preview)
  - [ ] Watermark upload works (preview)
  - [ ] Timezone selection works
  - [ ] Work mode selection works
  - [ ] Period settings save
  - [ ] Auto-fill settings work
  - [ ] Legal template saves

### User Settings (`/settings/notifications`)

- [ ] **Notification Preferences**
  - [ ] Email notifications toggle works
  - [ ] Push notifications toggle works
  - [ ] Deadline reminders toggle works
  - [ ] Approval notifications toggle works
  - [ ] Rejection notifications toggle works
  - [ ] Save button saves preferences
  - [ ] Preferences load on page refresh

## Expected Behavior After Fixes

1. **No 500 errors** on configuration pages
2. **Proper authentication** for admin endpoints
3. **Form submissions** work without errors
4. **File uploads** show previews
5. **API calls** return proper responses
6. **Configuration changes** persist in database

## Success Metrics

- Configuration page loads without errors
- All tabs are accessible and functional
- Form submissions succeed with proper feedback
- API endpoints return 200 responses (with auth)
- File uploads work with preview functionality
- Configuration changes persist after page reload