# Per-Tenant SMTP Configuration - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Run Database Migration

```bash
# Connect to your Supabase project
# Navigate to SQL Editor and run:
web/migrations/add-tenant-smtp-settings.sql
```

### Step 2: Set Environment Variable

Add to your `.env.local` file:

```env
# Generate a secure key with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

SMTP_ENCRYPTION_KEY=your-64-character-hex-key-here
```

**Generate Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Restart Your Application

```bash
npm run dev
```

### Step 4: Configure SMTP for a Tenant

1. Login as `ADMIN` or `TENANT_ADMIN`
2. Navigate to: `/admin/settings/email`
3. Enable custom SMTP
4. Fill in your SMTP details
5. Click "Save Configuration"
6. Send a test email to verify

---

## 📧 Common SMTP Providers

### Office 365 / Outlook

```
Host: smtp.office365.com
Port: 587
User: your-email@yourdomain.com
Password: your-password
From: your-email@yourdomain.com
```

**Note:** May require app password if MFA is enabled.

### Gmail

```
Host: smtp.gmail.com
Port: 587
User: your-email@gmail.com
Password: app-password (NOT your Gmail password)
From: your-email@gmail.com
```

**Important:** You MUST use an [App Password](https://support.google.com/accounts/answer/185833), not your regular Gmail password.

**How to get Gmail App Password:**
1. Go to Google Account settings
2. Security → 2-Step Verification
3. App passwords → Generate new app password
4. Use the generated 16-character password

### SendGrid

```
Host: smtp.sendgrid.net
Port: 587
User: apikey (literally the word "apikey")
Password: your-sendgrid-api-key
From: verified-sender@yourdomain.com
```

**Note:** Sender email must be verified in SendGrid.

### Mailgun

```
Host: smtp.mailgun.org
Port: 587
User: postmaster@your-domain.mailgun.org
Password: your-mailgun-smtp-password
From: noreply@your-domain.mailgun.org
```

### Amazon SES

```
Host: email-smtp.us-east-1.amazonaws.com (replace region)
Port: 587
User: your-ses-smtp-username
Password: your-ses-smtp-password
From: verified-email@yourdomain.com
```

**Note:** Email must be verified in SES.

---

## 🔧 Troubleshooting

### "Email disabled: missing credentials"

**Cause:** SMTP configuration is incomplete or disabled.

**Solution:**
1. Check if tenant SMTP is enabled
2. Verify all required fields are filled
3. Test configuration using "Send Test Email"

### "Failed to decrypt SMTP password"

**Cause:** `SMTP_ENCRYPTION_KEY` is missing or changed.

**Solution:**
1. Verify `SMTP_ENCRYPTION_KEY` is set in environment variables
2. Ensure the same key is used across all server instances
3. If key was changed, re-save SMTP configuration

### "Authentication failed"

**Cause:** Invalid SMTP credentials.

**Solution:**
1. Verify username and password are correct
2. For Gmail, ensure you're using an App Password
3. Check if your email provider requires additional security settings
4. Some providers require "less secure app access" to be enabled

### "Connection timeout"

**Cause:** Firewall or network issue.

**Solution:**
1. Verify SMTP host and port are correct
2. Check if your server can reach the SMTP host
3. Try alternative ports (587, 465, 25)
4. Check firewall rules

### "Sender address rejected"

**Cause:** From address is not verified or authorized.

**Solution:**
1. Verify the "From" email matches your SMTP username
2. For some providers (SendGrid, SES), verify the sender email
3. Check SPF/DKIM records for your domain

---

## 🧪 Testing Your Configuration

### Test 1: Send Test Email

1. Go to `/admin/settings/email`
2. Enter your email address in "Test Email Address"
3. Click "Send Test Email"
4. Check your inbox (and spam folder)

### Test 2: Create User Invitation

1. Go to `/admin/users`
2. Click "Invite User"
3. Fill in user details
4. Submit invitation
5. Check if invitation email was received

### Test 3: Timesheet Notification

1. Submit a timesheet
2. Check if manager receives notification email
3. Approve/reject timesheet
4. Check if employee receives notification email

---

## 🔐 Security Best Practices

### 1. Use App Passwords

For Gmail and other providers with 2FA, always use app-specific passwords.

### 2. Rotate Encryption Key

Periodically rotate your `SMTP_ENCRYPTION_KEY`:

```bash
# Generate new key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update environment variable
# Re-save all tenant SMTP configurations
```

### 3. Use Dedicated Email Accounts

Create dedicated email accounts for sending notifications (e.g., `noreply@yourdomain.com`).

### 4. Monitor Email Delivery

- Check email logs regularly
- Monitor bounce rates
- Set up SPF, DKIM, and DMARC records

### 5. Limit Access

Only grant `TENANT_ADMIN` role to trusted users who need to configure SMTP.

---

## 📊 Monitoring

### Check SMTP Usage

```sql
-- Get tenants with custom SMTP enabled
SELECT 
  id,
  name,
  settings->'smtp'->>'enabled' as smtp_enabled,
  settings->'smtp'->>'host' as smtp_host,
  settings->'smtp'->>'from' as smtp_from
FROM tenants
WHERE (settings->'smtp'->>'enabled')::boolean = true;
```

### Check Email Logs

Check your application logs for email-related messages:

```bash
# Look for email service logs
grep "email-service" logs/app.log

# Look for SMTP errors
grep "SMTP" logs/app.log | grep -i error
```

---

## 🆘 Need Help?

### Common Issues:

1. **Gmail "Less secure app access"**: Gmail has deprecated this. Use App Passwords instead.
2. **Office 365 "Authentication failed"**: Ensure SMTP AUTH is enabled in Exchange admin center.
3. **SendGrid "Sender address rejected"**: Verify sender email in SendGrid dashboard.
4. **Port blocked**: Try alternative ports (587, 465, 25).

### Support:

- Check application logs for detailed error messages
- Test SMTP configuration using external tools (e.g., `telnet smtp.example.com 587`)
- Verify DNS records (SPF, DKIM, DMARC)
- Contact your email provider's support

---

## ✅ Checklist

Before going to production:

- [ ] Database migration applied
- [ ] `SMTP_ENCRYPTION_KEY` set in production environment
- [ ] Default SMTP configured in environment variables (fallback)
- [ ] Test email sent successfully
- [ ] User invitation email received
- [ ] Timesheet notification email received
- [ ] SPF record configured for your domain
- [ ] DKIM configured (if supported by provider)
- [ ] DMARC policy configured
- [ ] Email logs monitored
- [ ] Bounce handling configured

---

**Ready to go!** 🎉

Your per-tenant SMTP configuration is now set up and ready to use.

