# Email Deliverability Guide for PontoFlow

## Overview

This guide provides instructions for configuring email authentication and improving deliverability for the PontoFlow multi-tenant timesheet management system.

## Current Email Configuration

**SMTP Provider:** Office 365 (smtp.office365.com:587)
**Authentication:** SMTP with username/password

## Email Deliverability Improvements Implemented

### 1. Email Headers

The following headers have been added to all outgoing emails:

- **Message-ID**: Unique identifier for each email (format: `<timestamp.random@domain>`)
- **X-Mailer**: Identifies the sending application (`PontoFlow Timesheet Manager`)
- **X-Priority**: Set to normal priority (3)
- **Reply-To**: Configured to the sender's email address
- **List-Unsubscribe**: Provides unsubscribe link for compliance

### 2. Unsubscribe Link

All emails now include an unsubscribe link in the footer, complying with email marketing best practices and regulations (CAN-SPAM, GDPR).

## DNS Configuration for Email Authentication

To prevent emails from being marked as spam, you MUST configure the following DNS records:

### SPF (Sender Policy Framework)

SPF verifies that emails are sent from authorized servers.

**For Office 365:**
```
Type: TXT
Name: @
Value: v=spf1 include:spf.protection.outlook.com -all
```

**For custom domain:**
```
Type: TXT
Name: @
Value: v=spf1 include:spf.protection.outlook.com include:_spf.google.com -all
```

### DKIM (DomainKeys Identified Mail)

DKIM adds a digital signature to verify email authenticity.

**For Office 365:**
1. Go to Microsoft 365 Admin Center
2. Navigate to Settings > Domains
3. Select your domain
4. Click "Enable DKIM signing"
5. Copy the two CNAME records provided
6. Add them to your DNS:

```
Type: CNAME
Name: selector1._domainkey
Value: selector1-<domain>._domainkey.<tenant>.onmicrosoft.com

Type: CNAME
Name: selector2._domainkey
Value: selector2-<domain>._domainkey.<tenant>.onmicrosoft.com
```

### DMARC (Domain-based Message Authentication)

DMARC tells receiving servers what to do with emails that fail SPF/DKIM checks.

**Recommended DMARC policy:**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourdomain.com; ruf=mailto:dmarc-forensics@yourdomain.com; fo=1
```

**Policy options:**
- `p=none` - Monitor only (recommended for testing)
- `p=quarantine` - Mark as spam if authentication fails
- `p=reject` - Reject emails that fail authentication (most strict)

## Verification Steps

### 1. Check DNS Records

Use online tools to verify your DNS configuration:
- [MXToolbox](https://mxtoolbox.com/SuperTool.aspx)
- [DMARC Analyzer](https://www.dmarcanalyzer.com/)
- [Mail Tester](https://www.mail-tester.com/)

### 2. Test Email Deliverability

1. Send a test email to [mail-tester.com](https://www.mail-tester.com/)
2. Check the score (aim for 10/10)
3. Review any warnings or errors
4. Fix issues and retest

### 3. Monitor Email Reports

- Set up DMARC reporting to receive daily/weekly reports
- Monitor bounce rates and spam complaints
- Check Office 365 message trace for delivery issues

## Recommended: Dedicated Email Service

For production environments with high email volume, consider using a dedicated email service:

### SendGrid
- **Pros**: Easy setup, good deliverability, detailed analytics
- **Pricing**: Free tier (100 emails/day), paid plans from $19.95/month
- **Setup**: [SendGrid Node.js Guide](https://docs.sendgrid.com/for-developers/sending-email/nodejs)

### AWS SES (Simple Email Service)
- **Pros**: Very affordable, scalable, integrates with AWS
- **Pricing**: $0.10 per 1,000 emails
- **Setup**: [AWS SES Node.js Guide](https://docs.aws.amazon.com/ses/latest/dg/send-email-nodejs.html)

### Mailgun
- **Pros**: Developer-friendly, good documentation
- **Pricing**: Free tier (5,000 emails/month), paid plans from $35/month
- **Setup**: [Mailgun Node.js Guide](https://documentation.mailgun.com/en/latest/quickstart-sending.html#send-via-api)

## Implementation Steps for Dedicated Service

### Example: Migrating to SendGrid

1. **Install SendGrid SDK:**
   ```bash
   npm install @sendgrid/mail
   ```

2. **Update email-service.ts:**
   ```typescript
   import sgMail from '@sendgrid/mail';
   
   sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
   
   export async function sendEmail({ to, subject, html }) {
     await sgMail.send({
       to,
       from: process.env.MAIL_FROM!,
       subject,
       html,
     });
   }
   ```

3. **Add environment variable:**
   ```
   SENDGRID_API_KEY=your_api_key_here
   ```

## Troubleshooting

### Emails Going to Spam

1. Verify SPF, DKIM, and DMARC records are correctly configured
2. Check email content for spam triggers (excessive links, all caps, etc.)
3. Ensure sender reputation is good (use [Sender Score](https://senderscore.org/))
4. Warm up your sending domain gradually (start with low volume)

### Emails Not Delivered

1. Check Office 365 message trace
2. Verify recipient email address is valid
3. Check for bounce messages
4. Ensure SMTP credentials are correct

### High Bounce Rate

1. Validate email addresses before sending
2. Remove invalid addresses from your list
3. Implement double opt-in for new users
4. Monitor bounce reports and remove hard bounces

## Best Practices

1. **Always use HTTPS** for links in emails
2. **Include plain text version** of emails (optional but recommended)
3. **Monitor email metrics**: open rates, click rates, bounce rates
4. **Respect unsubscribe requests** immediately
5. **Keep email lists clean**: remove inactive/bounced addresses
6. **Use consistent "From" name and address**
7. **Avoid spam trigger words**: free, guarantee, urgent, etc.
8. **Test emails** before sending to production

## Support

For issues with email deliverability:
1. Check Office 365 Admin Center for delivery reports
2. Review DNS configuration with your domain registrar
3. Contact Microsoft Support for Office 365 issues
4. Use email testing tools to diagnose problems

