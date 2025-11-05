# Per-Tenant SMTP - Usage Examples

## Overview

This document provides practical examples of how to use the per-tenant SMTP configuration system in your code.

---

## 1. Sending Emails with Tenant SMTP

### Basic Usage

```typescript
import { sendEmail } from '@/lib/notifications/email-service';

// Send email using tenant's SMTP configuration
await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to PontoFlow',
  html: '<h1>Welcome!</h1><p>Your account has been created.</p>',
  tenantId: 'tenant-uuid-here', // Optional: uses tenant SMTP if configured
});
```

### Without Tenant ID (Uses Global SMTP)

```typescript
// Send email using global/default SMTP configuration
await sendEmail({
  to: 'user@example.com',
  subject: 'System Notification',
  html: '<p>This is a system-wide notification.</p>',
  // No tenantId = uses global SMTP from environment variables
});
```

---

## 2. Sending Notification Emails

### Timesheet Notifications

```typescript
import { dispatchNotification } from '@/lib/notifications/dispatcher';

// Timesheet rejected notification
await dispatchNotification({
  type: 'timesheet_rejected',
  to: 'employee@example.com',
  payload: {
    employeeName: 'John Doe',
    managerName: 'Jane Smith',
    period: 'January 2025',
    reason: 'Missing clock-out times',
    annotations: [
      { field: 'Day 15', message: 'Clock-out time missing' }
    ],
    url: 'https://pontoflow.com/timesheets/123',
    locale: 'pt-BR',
    tenantId: 'tenant-uuid-here', // Uses tenant SMTP
  },
});

// Timesheet approved notification
await dispatchNotification({
  type: 'timesheet_approved',
  to: 'employee@example.com',
  payload: {
    employeeName: 'John Doe',
    managerName: 'Jane Smith',
    period: 'January 2025',
    url: 'https://pontoflow.com/timesheets/123',
    locale: 'en-GB',
    tenantId: 'tenant-uuid-here',
  },
});
```

### User Invitation Emails

```typescript
// In your invitation API route
import { sendEmail } from '@/lib/notifications/email-service';
import { getEmailContextByEmail } from '@/lib/notifications/email-context';

const emailContext = await getEmailContextByEmail(email);

await sendEmail({
  to: email,
  subject: 'You\'ve been invited to PontoFlow',
  html: generateInvitationEmail({
    firstName: 'John',
    lastName: 'Doe',
    invitedBy: 'Jane Smith',
    tenantName: emailContext.branding.tenantName,
    role: 'MANAGER',
    inviteUrl: 'https://pontoflow.com/accept-invite/token',
    expiresAt: new Date(),
    locale: emailContext.locale,
  }),
  tenantId: tenant_ids[0], // Use first tenant ID
});
```

---

## 3. Configuring SMTP via API

### Fetch SMTP Configuration

```typescript
// GET /api/admin/smtp/config?tenantId=xxx
const response = await fetch(`/api/admin/smtp/config?tenantId=${tenantId}`);
const data = await response.json();

console.log(data.smtp);
// {
//   enabled: true,
//   host: "smtp.office365.com",
//   port: 587,
//   user: "noreply@tenant.com",
//   from: "noreply@tenant.com",
//   from_name: "Tenant Name",
//   password_masked: "ab****yz"
// }
```

### Save SMTP Configuration

```typescript
// POST /api/admin/smtp/config
const response = await fetch('/api/admin/smtp/config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenantId: 'tenant-uuid-here',
    smtp: {
      enabled: true,
      host: 'smtp.office365.com',
      port: 587,
      user: 'noreply@tenant.com',
      password: 'your-password-here', // Will be encrypted
      from: 'noreply@tenant.com',
      from_name: 'Tenant Name',
    },
  }),
});

const data = await response.json();
console.log(data.message); // "SMTP configuration saved successfully"
```

### Test SMTP Configuration

```typescript
// POST /api/admin/smtp/test
const response = await fetch('/api/admin/smtp/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenantId: 'tenant-uuid-here',
    testEmail: 'test@example.com',
  }),
});

const data = await response.json();
console.log(data.message); // "Test email sent successfully to test@example.com"
```

---

## 4. Encryption Utilities

### Encrypt Password

```typescript
import { encryptSmtpPassword } from '@/lib/email/smtp-encryption';

const plainPassword = 'my-smtp-password';
const encrypted = encryptSmtpPassword(plainPassword);

console.log(encrypted);
// "a1b2c3d4e5f6....:1a2b3c4d5e6f....:9z8y7x6w5v4u...."
```

### Decrypt Password

```typescript
import { decryptSmtpPassword } from '@/lib/email/smtp-encryption';

const encrypted = 'a1b2c3d4e5f6....:1a2b3c4d5e6f....:9z8y7x6w5v4u....';
const plainPassword = decryptSmtpPassword(encrypted);

console.log(plainPassword); // "my-smtp-password"
```

### Mask Password for Display

```typescript
import { maskPassword } from '@/lib/email/smtp-encryption';

const password = 'my-smtp-password';
const masked = maskPassword(password);

console.log(masked); // "my******rd"
```

---

## 5. Direct Database Queries

### Get Tenant SMTP Configuration

```sql
-- Get SMTP configuration for a specific tenant
SELECT 
  id,
  name,
  settings->'smtp' as smtp_config
FROM tenants
WHERE id = 'tenant-uuid-here';
```

### Update SMTP Configuration

```sql
-- Enable SMTP for a tenant
UPDATE tenants
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{smtp}',
  '{
    "enabled": true,
    "host": "smtp.office365.com",
    "port": 587,
    "user": "noreply@tenant.com",
    "password_encrypted": "encrypted_password_here",
    "from": "noreply@tenant.com",
    "from_name": "Tenant Name"
  }'::jsonb
)
WHERE id = 'tenant-uuid-here';
```

### Disable SMTP for a Tenant

```sql
-- Disable SMTP (will use global SMTP)
UPDATE tenants
SET settings = jsonb_set(
  settings,
  '{smtp,enabled}',
  'false'::jsonb
)
WHERE id = 'tenant-uuid-here';
```

### List All Tenants with Custom SMTP

```sql
-- Get all tenants with custom SMTP enabled
SELECT 
  id,
  name,
  settings->'smtp'->>'host' as smtp_host,
  settings->'smtp'->>'from' as smtp_from,
  settings->'smtp'->>'enabled' as smtp_enabled
FROM tenants
WHERE (settings->'smtp'->>'enabled')::boolean = true
ORDER BY name;
```

---

## 6. React Component Usage

### Using TenantSmtpSettings Component

```tsx
import TenantSmtpSettings from '@/components/admin/TenantSmtpSettings';

export default function EmailSettingsPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Email Settings</h1>
      
      <TenantSmtpSettings
        tenantId="tenant-uuid-here"
        tenantName="My Company"
      />
    </div>
  );
}
```

---

## 7. Error Handling

### Handle Email Send Errors

```typescript
import { sendEmail } from '@/lib/notifications/email-service';

try {
  await sendEmail({
    to: 'user@example.com',
    subject: 'Test Email',
    html: '<p>Test</p>',
    tenantId: 'tenant-uuid-here',
  });
  
  console.log('Email sent successfully');
} catch (error) {
  console.error('Failed to send email:', error);
  
  // Email service logs warnings but doesn't throw errors
  // Check logs for: "[email-service] Email disabled: missing credentials"
}
```

### Handle SMTP Configuration Errors

```typescript
try {
  const response = await fetch('/api/admin/smtp/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId, smtp: config }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to save SMTP configuration');
  }
  
  console.log('SMTP configuration saved');
} catch (error) {
  console.error('Error saving SMTP configuration:', error.message);
  // Handle error (show toast, alert, etc.)
}
```

---

## 8. Testing Examples

### Test Encryption

```typescript
import { testEncryption } from '@/lib/email/smtp-encryption';

const isWorking = testEncryption();
console.log('Encryption working:', isWorking); // true or false
```

### Test SMTP Connection (Manual)

```typescript
import nodemailer from 'nodemailer';

async function testSmtpConnection() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
      user: 'noreply@tenant.com',
      pass: 'your-password',
    },
  });
  
  try {
    await transporter.verify();
    console.log('SMTP connection successful');
  } catch (error) {
    console.error('SMTP connection failed:', error);
  }
}
```

---

## 9. Common Patterns

### Pattern 1: Send Email with Tenant Context

```typescript
async function sendTenantEmail(tenantId: string, to: string, subject: string, html: string) {
  await sendEmail({
    to,
    subject,
    html,
    tenantId, // Always pass tenantId for tenant-specific emails
  });
}
```

### Pattern 2: Fallback to Global SMTP

```typescript
async function sendSystemEmail(to: string, subject: string, html: string) {
  await sendEmail({
    to,
    subject,
    html,
    // No tenantId = uses global SMTP
  });
}
```

### Pattern 3: Get Tenant SMTP Status

```typescript
async function getTenantSmtpStatus(tenantId: string): Promise<boolean> {
  const response = await fetch(`/api/admin/smtp/config?tenantId=${tenantId}`);
  const data = await response.json();
  return data.smtp?.enabled === true;
}
```

---

## 10. Best Practices

1. **Always pass tenantId for tenant-specific emails**
   ```typescript
   // ✅ Good
   await sendEmail({ to, subject, html, tenantId });
   
   // ❌ Bad (uses global SMTP)
   await sendEmail({ to, subject, html });
   ```

2. **Test SMTP configuration after saving**
   ```typescript
   // Save configuration
   await saveSmtpConfig(tenantId, config);
   
   // Test it
   await testSmtpConfig(tenantId, testEmail);
   ```

3. **Handle errors gracefully**
   ```typescript
   try {
     await sendEmail({ to, subject, html, tenantId });
   } catch (error) {
     console.error('Email failed:', error);
     // Don't fail the entire operation
   }
   ```

4. **Use encryption utilities**
   ```typescript
   // ✅ Good - encrypt before storing
   const encrypted = encryptSmtpPassword(password);
   await saveToDatabase(encrypted);
   
   // ❌ Bad - never store plain text passwords
   await saveToDatabase(password);
   ```

---

**Happy coding!** 🚀

