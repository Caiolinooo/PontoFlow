# Per-Tenant SMTP Configuration - Implementation Summary

## Overview

Successfully implemented per-tenant SMTP configuration for the PontoFlow multi-tenant system. Each tenant can now configure their own email server settings, enabling custom email branding and delivery from their own domains.

---

## ✅ What Was Implemented

### 1. Database Schema

**File:** `web/migrations/add-tenant-smtp-settings.sql`

- Added SMTP configuration support to `tenants.settings` JSONB field
- Created validation function `validate_smtp_settings()` to ensure data integrity
- Added check constraint to validate SMTP settings structure
- Created index for tenants with SMTP enabled

**SMTP Settings Structure:**
```json
{
  "smtp": {
    "enabled": true,
    "host": "smtp.office365.com",
    "port": 587,
    "user": "noreply@tenant-domain.com",
    "password_encrypted": "encrypted_password_here",
    "from": "noreply@tenant-domain.com",
    "from_name": "Tenant Name"
  }
}
```

### 2. Password Encryption

**File:** `web/src/lib/email/smtp-encryption.ts`

- Implemented AES-256-GCM encryption for SMTP passwords
- Functions:
  - `encryptSmtpPassword()` - Encrypts plain text passwords
  - `decryptSmtpPassword()` - Decrypts encrypted passwords
  - `maskPassword()` - Masks passwords for display (e.g., "ab****yz")
  - `validateSmtpPassword()` - Validates password strength
  - `testEncryption()` - Tests encryption/decryption functionality

**Security Features:**
- Uses environment variable `SMTP_ENCRYPTION_KEY` for encryption key
- Falls back to default key in development (with warning)
- Encrypted format: `iv:authTag:encrypted` (all in hex)

### 3. Email Service Updates

**File:** `web/src/lib/notifications/email-service.ts`

**Changes:**
- Added `getTenantSmtpConfig(tenantId)` function to fetch tenant-specific SMTP
- Updated `sendEmail()` to accept optional `tenantId` parameter
- Implemented fallback logic: uses tenant SMTP if configured, otherwise uses global config
- Added support for custom "From Name" in email headers

**Behavior:**
1. If `tenantId` is provided, fetch tenant's SMTP settings from database
2. If tenant has SMTP enabled and configured, use it
3. If tenant SMTP is not configured or disabled, use global default
4. If decryption fails, fall back to global default

### 4. Notification Dispatcher Updates

**File:** `web/src/lib/notifications/dispatcher.ts`

**Changes:**
- Updated all `sendEmail()` calls to pass `tenantId` parameter
- Ensures all notification emails use tenant-specific SMTP when available

**Updated Email Types:**
- `timesheet_rejected` - ✅ Passes tenantId
- `timesheet_approved` - ✅ Passes tenantId
- `timesheet_submitted` - ✅ Passes tenantId
- `timesheet_adjusted` - ✅ Passes tenantId
- `deadline_reminder` - Uses global SMTP (no tenant context)
- `manager_pending_reminder` - Uses global SMTP (no tenant context)

### 5. Invitation Email Updates

**File:** `web/src/app/api/admin/invitations/route.ts`

**Changes:**
- Updated invitation email sending to pass `tenantId` (first tenant from `tenant_ids` array)
- Ensures invitation emails use tenant-specific SMTP

### 6. Admin UI Component

**File:** `web/src/components/admin/TenantSmtpSettings.tsx`

**Features:**
- Enable/disable toggle for custom SMTP
- Form fields for all SMTP settings:
  - SMTP Host (e.g., smtp.office365.com)
  - SMTP Port (587, 465, 25)
  - SMTP Username (email address)
  - SMTP Password (encrypted before storage)
  - From Email (sender address)
  - From Name (display name)
- Save configuration button with validation
- Test email functionality
- Real-time error and success messages
- Password masking for security

### 7. API Endpoints

#### GET `/api/admin/smtp/config`

**File:** `web/src/app/api/admin/smtp/config/route.ts`

- Fetches SMTP configuration for a tenant
- Requires `ADMIN` or `TENANT_ADMIN` role
- Returns masked password for security
- Query parameter: `tenantId`

#### POST `/api/admin/smtp/config`

**File:** `web/src/app/api/admin/smtp/config/route.ts`

- Saves SMTP configuration for a tenant
- Validates all required fields
- Encrypts password before storage
- Requires `ADMIN` or `TENANT_ADMIN` role
- Body: `{ tenantId, smtp: { ... } }`

#### POST `/api/admin/smtp/test`

**File:** `web/src/app/api/admin/smtp/test/route.ts`

- Sends a test email using tenant's SMTP configuration
- Validates email format
- Requires `ADMIN` or `TENANT_ADMIN` role
- Body: `{ tenantId, testEmail }`

### 8. Admin Settings Page

**File:** `web/src/app/[locale]/admin/settings/email/page.tsx`

**Features:**
- Lists all accessible tenants (based on user role)
- Shows SMTP configuration form for selected tenant
- Displays helpful information about SMTP providers
- Security and fallback information
- Common SMTP provider examples

---

## 🔐 Security Features

1. **Password Encryption:**
   - AES-256-GCM encryption algorithm
   - Unique IV (Initialization Vector) for each encryption
   - Authentication tag for integrity verification
   - Encryption key from environment variable

2. **Access Control:**
   - `ADMIN` users can configure SMTP for any tenant
   - `TENANT_ADMIN` users can only configure SMTP for their tenants
   - API endpoints validate user permissions

3. **Password Masking:**
   - Passwords are never returned in API responses
   - Only masked version is shown (e.g., "ab****yz")

4. **Validation:**
   - Email format validation
   - Port number validation (1-65535)
   - Required fields validation
   - Database constraint validation

---

## 🚀 How to Use

### For ADMIN Users:

1. Navigate to `/admin/settings/email`
2. Select a tenant (if multiple tenants available)
3. Enable custom SMTP
4. Fill in SMTP configuration:
   - Host: Your SMTP server (e.g., smtp.office365.com)
   - Port: Usually 587 for TLS
   - Username: Your email address
   - Password: Your SMTP password or app password
   - From Email: Sender email address
   - From Name: Display name for emails
5. Click "Save Configuration"
6. Test the configuration by entering a test email address and clicking "Send Test Email"

### For TENANT_ADMIN Users:

Same as above, but can only configure SMTP for their own tenant(s).

---

## 📋 Environment Variables

### Required for Production:

```env
# SMTP Encryption Key (REQUIRED for production)
SMTP_ENCRYPTION_KEY=your-secure-random-key-here

# Default/Fallback SMTP Configuration
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-password-here
MAIL_FROM=noreply@yourdomain.com
```

### Generating Encryption Key:

```bash
# Generate a secure random key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🧪 Testing Checklist

- [ ] Run database migration: `add-tenant-smtp-settings.sql`
- [ ] Set `SMTP_ENCRYPTION_KEY` environment variable
- [ ] Test encryption/decryption functionality
- [ ] Configure SMTP for a test tenant
- [ ] Send test email to verify configuration
- [ ] Create user invitation and verify it uses tenant SMTP
- [ ] Submit timesheet and verify notification uses tenant SMTP
- [ ] Approve/reject timesheet and verify notification uses tenant SMTP
- [ ] Disable tenant SMTP and verify fallback to global config
- [ ] Test with invalid SMTP credentials (should fail gracefully)
- [ ] Test TENANT_ADMIN access control (can only configure their tenants)

---

## 📊 Benefits

1. **Custom Branding:** Each tenant can send emails from their own domain
2. **Better Deliverability:** Emails come from tenant's domain, reducing spam risk
3. **Flexibility:** Tenants can use their preferred email provider
4. **Security:** Passwords are encrypted, not stored in plain text
5. **Fallback:** System continues working if tenant SMTP is not configured
6. **Multi-Tenant:** True SaaS architecture with per-tenant configuration
7. **Easy Management:** Simple UI for configuring and testing SMTP

---

## 🔄 Migration Path

### For Existing Tenants:

1. Existing tenants will continue using global SMTP configuration
2. No action required - system falls back to global config automatically
3. Tenants can opt-in to custom SMTP by configuring it in admin panel

### For New Tenants:

1. Can configure custom SMTP immediately after tenant creation
2. Or use global SMTP configuration by default

---

## 🐛 Troubleshooting

### Email Not Sending:

1. Check if tenant SMTP is enabled
2. Verify SMTP credentials are correct
3. Test SMTP configuration using "Send Test Email" button
4. Check server logs for encryption/decryption errors
5. Verify `SMTP_ENCRYPTION_KEY` is set correctly

### Access Denied:

1. Verify user has `ADMIN` or `TENANT_ADMIN` role
2. For `TENANT_ADMIN`, verify they have access to the tenant
3. Check `tenant_user_roles` table for correct role assignment

### Encryption Errors:

1. Verify `SMTP_ENCRYPTION_KEY` environment variable is set
2. Ensure the same key is used across all server instances
3. Check server logs for detailed error messages

---

## 📚 Related Files

- `web/migrations/add-tenant-smtp-settings.sql` - Database migration
- `web/src/lib/email/smtp-encryption.ts` - Encryption utilities
- `web/src/lib/notifications/email-service.ts` - Email sending service
- `web/src/lib/notifications/dispatcher.ts` - Notification dispatcher
- `web/src/components/admin/TenantSmtpSettings.tsx` - Admin UI component
- `web/src/app/api/admin/smtp/config/route.ts` - SMTP config API
- `web/src/app/api/admin/smtp/test/route.ts` - SMTP test API
- `web/src/app/[locale]/admin/settings/email/page.tsx` - Admin settings page

---

**Status:** ✅ Implementation Complete

All features have been implemented and are ready for testing!

