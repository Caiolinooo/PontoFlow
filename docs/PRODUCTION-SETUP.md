# Production Setup Guide

**Last Updated**: 2025-10-16  
**Version**: 1.0

## Overview

This guide walks through setting up the Timesheet Manager in a production environment.

## Prerequisites Checklist

- [ ] GitHub repository created
- [ ] Supabase production project created
- [ ] SMTP credentials obtained
- [ ] Domain name (optional)
- [ ] Vercel account (or alternative hosting)

## Step 1: Supabase Production Setup

### 1.1 Create Production Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization
4. Set project name: `timesheet-manager-prod`
5. Set strong database password
6. Choose region closest to users
7. Wait for project to be ready (~2 minutes)

### 1.2 Run Database Migrations

1. Go to SQL Editor in Supabase Dashboard
2. Create new query
3. Copy and paste schema from `docs/database/schema.sql`
4. Click "Run"
5. Repeat for RLS policies and functions

### 1.3 Configure Authentication

1. Go to Authentication → Settings
2. Set Site URL: `https://your-domain.com`
3. Add Redirect URLs:
   - `https://your-domain.com/auth/callback`
   - `https://your-domain.vercel.app/auth/callback`
4. Configure email templates (optional)
5. Enable email confirmations (optional)

### 1.4 Get API Keys

1. Go to Settings → API
2. Copy:
   - Project URL
   - `anon` public key
   - `service_role` key (keep secret!)

## Step 2: SMTP Configuration

### Option A: Gmail

1. Enable 2-factor authentication on Gmail
2. Go to Google Account → Security → App Passwords
3. Generate app password for "Mail"
4. Save credentials:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - User: your Gmail address
   - Pass: generated app password

### Option B: SendGrid

1. Create SendGrid account
2. Verify sender identity
3. Create API key
4. Save credentials:
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - User: `apikey`
   - Pass: your API key

### Option C: AWS SES

1. Verify domain in AWS SES
2. Create SMTP credentials
3. Save credentials:
   - Host: `email-smtp.us-east-1.amazonaws.com`
   - Port: `587`
   - User: SMTP username
   - Pass: SMTP password

## Step 3: VAPID Keys for Push Notifications

### Generate Keys

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys

# Output:
# =======================================
# Public Key:
# BN...
#
# Private Key:
# ...
# =======================================
```

Save both keys securely.

## Step 4: Vercel Setup

### 4.1 Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select the `web` directory as root directory

### 4.2 Configure Build Settings

- **Framework Preset**: Next.js
- **Root Directory**: `web`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 4.3 Add Environment Variables

Add these in Vercel dashboard → Settings → Environment Variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=noreply@your-domain.com

# VAPID
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# Base URL
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app

# Locale
NEXT_PUBLIC_DEFAULT_LOCALE=pt-BR
NEXT_PUBLIC_AVAILABLE_LOCALES=pt-BR,en-GB

# Optional: Monitoring
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

**Important**: Set environment variables for all environments (Production, Preview, Development).

### 4.4 Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Visit deployment URL to verify

## Step 5: Custom Domain (Optional)

### 5.1 Add Domain in Vercel

1. Go to Settings → Domains
2. Add your domain: `timesheet.your-domain.com`
3. Vercel will provide DNS records

### 5.2 Configure DNS

Add these records in your DNS provider:

**For subdomain** (e.g., `timesheet.your-domain.com`):
```
Type: CNAME
Name: timesheet
Value: cname.vercel-dns.com
```

**For apex domain** (e.g., `your-domain.com`):
```
Type: A
Name: @
Value: 76.76.21.21

Type: AAAA
Name: @
Value: 2606:4700:4700::1111
```

### 5.3 Verify Domain

1. Wait for DNS propagation (~5-60 minutes)
2. Vercel will automatically verify and issue SSL certificate
3. Test: `https://timesheet.your-domain.com`

## Step 6: GitHub Secrets

Add these secrets in GitHub repository → Settings → Secrets:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
SNYK_TOKEN (optional)
```

To get Vercel tokens:
1. Go to Vercel → Settings → Tokens
2. Create new token
3. Copy token to GitHub secrets

## Step 7: Monitoring Setup

### 7.1 Vercel Analytics

1. Go to Vercel dashboard → Analytics
2. Enable Analytics
3. View real-time metrics

### 7.2 Sentry (Error Tracking)

```bash
cd web
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Add to environment variables:
```env
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-auth-token
```

### 7.3 Uptime Monitoring

Use services like:
- **UptimeRobot**: Free, 5-minute checks
- **Pingdom**: Paid, 1-minute checks
- **StatusCake**: Free tier available

Configure alerts for:
- HTTP 200 status
- Response time < 2s
- SSL certificate expiry

## Step 8: Smoke Tests

### 8.1 Authentication

- [ ] Sign up new user
- [ ] Sign in existing user
- [ ] Sign out
- [ ] Password reset

### 8.2 Employee Flow

- [ ] View timesheets
- [ ] Create entry
- [ ] Edit entry
- [ ] Delete entry
- [ ] Submit timesheet

### 8.3 Manager Flow

- [ ] View pending timesheets
- [ ] Review timesheet
- [ ] Add annotations
- [ ] Approve timesheet
- [ ] Reject timesheet

### 8.4 Notifications

- [ ] Email on submit
- [ ] Email on approve
- [ ] Email on reject
- [ ] Push notification (if enabled)

### 8.5 Reports

- [ ] Generate summary report
- [ ] Generate detailed report
- [ ] Export CSV
- [ ] Export JSON

### 8.6 Admin

- [ ] Manage users
- [ ] Manage tenants
- [ ] View system logs

## Step 9: Performance Optimization

### 9.1 Enable Caching

Already configured in Next.js config.

### 9.2 Image Optimization

Vercel automatically optimizes images.

### 9.3 Database Indexes

Ensure indexes are created:
```sql
CREATE INDEX IF NOT EXISTS idx_timesheets_employee_id ON timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_entries_timesheet_id ON timesheet_entries(timesheet_id);
```

### 9.4 Run Lighthouse Audit

1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Run audit
4. Target scores:
   - Performance: 90+
   - Accessibility: 90+
   - Best Practices: 90+
   - SEO: 90+

## Step 10: Security Checklist

- [ ] All environment variables configured
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Service role key not exposed
- [ ] RLS policies active in Supabase
- [ ] CORS configured correctly
- [ ] Rate limiting enabled (Vercel automatic)
- [ ] SMTP credentials secure
- [ ] Regular security updates scheduled

## Step 11: Backup Strategy

### Database Backups

Supabase provides automatic daily backups. For additional backups:

1. Go to Supabase Dashboard → Database → Backups
2. Enable Point-in-Time Recovery (PITR) for paid plans
3. Schedule manual backups:

```bash
# Export database
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  > backup-$(date +%Y%m%d).sql
```

### Code Backups

GitHub automatically backs up code. Ensure:
- [ ] All code committed
- [ ] Tags created for releases
- [ ] Protected branches configured

## Step 12: Documentation

Update documentation with production URLs:

- [ ] Update README.md
- [ ] Update API documentation
- [ ] Update deployment guide
- [ ] Create runbook for operations

## Step 13: Handoff

Prepare handoff documentation:

1. **Access Credentials**:
   - Supabase dashboard
   - Vercel dashboard
   - GitHub repository
   - SMTP credentials
   - Domain registrar

2. **Monitoring**:
   - Vercel Analytics URL
   - Sentry dashboard
   - Uptime monitor

3. **Support Contacts**:
   - Technical lead
   - DevOps contact
   - Emergency contact

4. **Runbook**:
   - Common operations
   - Troubleshooting steps
   - Escalation procedures

## Rollback Plan

If issues occur after deployment:

1. **Vercel**: Go to Deployments → Previous deployment → "Promote to Production"
2. **Database**: Restore from backup if needed
3. **Notify**: Alert users of rollback

## Post-Deployment

- [ ] Monitor logs for 24 hours
- [ ] Check error rates in Sentry
- [ ] Verify email delivery
- [ ] Test push notifications
- [ ] Review performance metrics
- [ ] Collect user feedback

## Support

For production setup issues:
- **Email**: production-support@abzgroup.com
- **GitHub**: Open an issue with `production` label

---

**Last Updated**: 2025-10-16  
**Status**: ✅ Production Ready

