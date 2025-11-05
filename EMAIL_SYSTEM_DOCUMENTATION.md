# PontoFlow Email System Documentation

## Overview

PontoFlow features a comprehensive, multi-tenant, multi-language email system that supports:
- **Multi-language emails** (Portuguese pt-BR and English en-GB)
- **Multi-tenant branding** (logos, banners, watermarks, colors)
- **Professional appearance** (no emojis, proper formatting)
- **Email deliverability** (SPF/DKIM/DMARC support, proper headers)
- **User locale detection** (automatic language selection based on user preferences)

## Architecture

### Core Components

1. **email-service.ts** - Core email sending service using Nodemailer
2. **email-context.ts** - Tenant branding and user locale utilities
3. **email-layout.ts** - Reusable email layout with branding support
4. **dispatcher.ts** - Notification dispatcher for timesheet events
5. **templates/** - Individual email templates for different notification types

### Email Flow

```
User Action → Dispatcher → Email Context → Template → Layout → SMTP → Recipient
```

## Multi-Language Support

### Supported Locales

- `pt-BR` - Portuguese (Brazil)
- `en-GB` - English (United Kingdom)

### How It Works

1. **User Locale Detection**: System fetches user's locale from `profiles.locale` field
2. **Automatic Selection**: Email templates automatically use the user's preferred language
3. **Fallback**: Defaults to `pt-BR` if locale is not set or invalid

### Example Usage

```typescript
import { getUserLocale, getUserLocaleByEmail } from '@/lib/notifications/email-context';

// For existing users
const locale = await getUserLocale(userId);

// For invitations (user doesn't exist yet)
const locale = await getUserLocaleByEmail(email);
```

## Multi-Tenant Branding

### Branding Configuration

Tenant branding is stored in the `tenants.settings` JSONB field:

```json
{
  "branding": {
    "logo_url": "https://cdn.example.com/logo.png",
    "banner_url": "https://cdn.example.com/banner.png",
    "watermark_url": "https://cdn.example.com/watermark.png",
    "primary_color": "#005dff",
    "secondary_color": "#6339F5",
    "company_name_override": "My Company"
  }
}
```

### Setting Tenant Branding

**Via Supabase Dashboard:**
1. Go to Table Editor → tenants
2. Select the tenant
3. Edit the `settings` field
4. Add the branding JSON structure

**Via SQL:**
```sql
UPDATE tenants 
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{branding}',
  '{
    "logo_url": "https://your-cdn.com/logo.png",
    "primary_color": "#005dff",
    "secondary_color": "#6339F5"
  }'::jsonb
)
WHERE id = 'tenant-id-here';
```

### Fetching Tenant Branding

```typescript
import { getTenantBranding } from '@/lib/notifications/email-context';

const branding = await getTenantBranding(tenantId);
// Returns: { tenantId, tenantName, logoUrl, bannerUrl, watermarkUrl, primaryColor, secondaryColor, companyNameOverride }
```

## Email Templates

### Available Templates

1. **User Invitation** - Sent when a user is invited to join the system
2. **Timesheet Submitted** - Notifies managers when an employee submits a timesheet
3. **Timesheet Approved** - Notifies employees when their timesheet is approved
4. **Timesheet Rejected** - Notifies employees when their timesheet is rejected
5. **Timesheet Adjusted** - Notifies employees when their timesheet is adjusted by a manager
6. **Deadline Reminder** - Reminds employees to submit their timesheets
7. **Manager Pending Reminder** - Reminds managers to review pending timesheets

### Creating a New Email Template

1. Create a new file in `web/src/lib/notifications/templates/`
2. Use the email layout utility:

```typescript
import { emailLayout, EmailLocale } from '../email-layout';

export function myCustomEmail({
  recipientName,
  locale,
  branding,
}: {
  recipientName: string;
  locale: EmailLocale;
  branding?: { companyName?: string; logoUrl?: string };
}) {
  const translations = {
    'pt-BR': {
      subject: 'Assunto do Email',
      greeting: 'Olá',
      message: 'Sua mensagem aqui',
    },
    'en-GB': {
      subject: 'Email Subject',
      greeting: 'Hello',
      message: 'Your message here',
    },
  };

  const t = translations[locale] || translations['pt-BR'];

  const content = `
    <p>${t.greeting} <strong>${recipientName}</strong>,</p>
    <p>${t.message}</p>
  `;

  const html = emailLayout({
    locale,
    subject: t.subject,
    content,
    companyNameOverride: branding?.companyName,
    logoUrlOverride: branding?.logoUrl,
  });

  return { subject: t.subject, html };
}
```

3. Add the template to the dispatcher in `dispatcher.ts`

## Sending Emails

### Direct Email Sending

```typescript
import { sendEmail } from '@/lib/notifications/email-service';

await sendEmail({
  to: 'user@example.com',
  subject: 'Email Subject',
  html: '<p>Email content</p>',
});
```

### Using the Dispatcher

```typescript
import { dispatchNotification } from '@/lib/notifications/dispatcher';

await dispatchNotification({
  type: 'timesheet_approved',
  to: 'employee@example.com',
  payload: {
    employeeName: 'John Doe',
    managerName: 'Jane Smith',
    period: 'January 2025',
    url: 'https://app.pontoflow.com/timesheets/123',
    locale: 'pt-BR',
    tenantId: 'tenant-id-here',
  },
});
```

## Environment Variables

Required environment variables for email functionality:

```env
# SMTP Configuration
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
MAIL_FROM=noreply@yourdomain.com

# Supabase (for tenant branding and user locale)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Testing Emails

### Test Email Service

Use the test email service to verify SMTP configuration:

```typescript
import { testEmailService } from '@/lib/email/test-service';

const result = await testEmailService('test@example.com');
console.log(result); // { success: true, message: 'Test email sent successfully' }
```

### Manual Testing

1. Navigate to `/api/test-email` endpoint (if implemented)
2. Or use the test service directly in your code
3. Check recipient inbox and spam folder
4. Verify email formatting and branding

## Troubleshooting

### Emails Not Sending

1. Check SMTP credentials in `.env.local`
2. Verify SMTP server is accessible (firewall, network)
3. Check console logs for error messages
4. Test SMTP connection with a simple script

### Emails Going to Spam

1. Configure SPF, DKIM, and DMARC records (see EMAIL_DELIVERABILITY_GUIDE.md)
2. Verify sender reputation
3. Check email content for spam triggers
4. Use email testing tools (mail-tester.com)

### Wrong Language in Emails

1. Verify user's locale in `profiles` table
2. Check that locale is being passed correctly to email templates
3. Ensure fallback to `pt-BR` is working

### Missing Tenant Branding

1. Verify tenant branding is configured in `tenants.settings`
2. Check that `tenantId` is being passed to email functions
3. Verify `getTenantBranding()` is being called correctly

## Best Practices

1. **Always fetch user locale** - Don't hardcode language
2. **Always fetch tenant branding** - Don't hardcode company names
3. **Test emails in both languages** - Ensure translations are correct
4. **Use email layout utility** - Maintain consistent formatting
5. **Handle errors gracefully** - Don't fail requests if email fails
6. **Log email sending** - For debugging and monitoring
7. **Respect unsubscribe requests** - Implement unsubscribe functionality
8. **Monitor deliverability** - Track bounce rates and spam complaints

## Future Enhancements

- [ ] Add more languages (Spanish, French, etc.)
- [ ] Implement email templates editor in admin panel
- [ ] Add email scheduling and queuing
- [ ] Implement email analytics (open rates, click rates)
- [ ] Add support for attachments
- [ ] Implement email preferences per user
- [ ] Add A/B testing for email templates
- [ ] Integrate with dedicated email service (SendGrid, AWS SES)

## Related Documentation

- [EMAIL_DELIVERABILITY_GUIDE.md](./EMAIL_DELIVERABILITY_GUIDE.md) - SPF/DKIM/DMARC setup
- [INVITATION_FIXES_SUMMARY.md](./INVITATION_FIXES_SUMMARY.md) - Invitation system fixes
- [FOREIGN_KEY_FIX_SUMMARY.md](./FOREIGN_KEY_FIX_SUMMARY.md) - Database fixes

