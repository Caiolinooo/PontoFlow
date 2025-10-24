# Deploy Guide

**Last Updated**: 2025-10-16  
**Version**: 1.0

## Overview

This guide covers deploying the Timesheet Manager to production environments.

## Prerequisites

- Node.js 18+
- Supabase project (production)
- SMTP server credentials
- VAPID keys for push notifications
- Domain name (optional)

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel provides the best experience for Next.js applications.

#### Step 1: Prepare Repository

```bash
# Ensure all changes are committed
git add .
git commit -m "chore: prepare for deployment"
git push origin main
```

#### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select the `web` directory as the root

#### Step 3: Configure Environment Variables

Add these environment variables in Vercel dashboard:

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
```

#### Step 4: Deploy

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd web
vercel --prod
```

#### Step 5: Configure Domain (Optional)

1. Go to Vercel dashboard → Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

### Option 2: Netlify

#### Step 1: Build Configuration

Create `netlify.toml` in the `web` directory:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

#### Step 2: Deploy

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd web
netlify deploy --prod
```

#### Step 3: Configure Environment Variables

Add environment variables in Netlify dashboard (same as Vercel).

### Option 3: Docker

#### Step 1: Create Dockerfile

```dockerfile
# web/Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### Step 2: Build and Run

```bash
# Build image
docker build -t timesheet-manager ./web

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  -e SMTP_HOST=... \
  -e SMTP_PORT=... \
  -e SMTP_USER=... \
  -e SMTP_PASS=... \
  -e MAIL_FROM=... \
  -e NEXT_PUBLIC_VAPID_PUBLIC_KEY=... \
  -e VAPID_PRIVATE_KEY=... \
  timesheet-manager
```

### Option 4: Self-Hosted

#### Step 1: Build Application

```bash
cd web
npm install
npm run build
```

#### Step 2: Start Production Server

```bash
npm start
```

#### Step 3: Use Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "timesheet-manager" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Database Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for project to be ready

### Step 2: Run Migrations

1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL files in order:
   - `docs/database/schema.sql`
   - `docs/database/rls-policies.sql`
   - `docs/database/functions.sql`

### Step 3: Configure Auth

1. Go to Authentication → Settings
2. Configure email templates
3. Set site URL to your production URL
4. Configure redirect URLs

## SMTP Configuration

### Gmail

1. Enable 2-factor authentication
2. Generate app password
3. Use these settings:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - User: Your Gmail address
   - Pass: App password

### SendGrid

1. Create SendGrid account
2. Generate API key
3. Use these settings:
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - User: `apikey`
   - Pass: Your API key

### AWS SES

1. Verify domain in AWS SES
2. Create SMTP credentials
3. Use these settings:
   - Host: `email-smtp.us-east-1.amazonaws.com`
   - Port: `587`
   - User: Your SMTP username
   - Pass: Your SMTP password

## VAPID Keys Generation

```bash
# Install web-push
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys

# Output:
# Public Key: BN...
# Private Key: ...
```

Add these keys to your environment variables.

## SSL/HTTPS

### Vercel/Netlify

SSL is automatically configured.

### Self-Hosted

Use Let's Encrypt with Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring

### Vercel Analytics

Enable in Vercel dashboard → Analytics.

### Sentry (Error Tracking)

```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

### Uptime Monitoring

Use services like:
- UptimeRobot
- Pingdom
- StatusCake

## Backup Strategy

### Database Backups

Supabase provides automatic daily backups. For additional backups:

```bash
# Export database
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  > backup.sql
```

### File Backups

If using Supabase Storage, enable versioning.

## Rollback Strategy

### Vercel

1. Go to Deployments
2. Find previous deployment
3. Click "Promote to Production"

### Docker

```bash
# Tag images with versions
docker tag timesheet-manager:latest timesheet-manager:v1.0.0

# Rollback
docker stop timesheet-manager
docker run -d --name timesheet-manager timesheet-manager:v0.9.0
```

## Performance Optimization

### Enable Caching

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### Enable Compression

Vercel/Netlify enable this automatically. For self-hosted:

```javascript
// server.js
const compression = require('compression');
app.use(compression());
```

## Security Checklist

- [ ] All environment variables configured
- [ ] HTTPS enabled
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Database RLS policies active
- [ ] Service role key not exposed
- [ ] SMTP credentials secure
- [ ] Regular security updates

## Post-Deployment

1. **Test all features**:
   - Authentication
   - Timesheet CRUD
   - Manager approval
   - Email notifications
   - Push notifications
   - Reports
   - Export

2. **Monitor logs** for errors

3. **Check performance** with Lighthouse

4. **Setup monitoring** and alerts

5. **Document** any custom configurations

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues.

## Support

For deployment issues:
- **Email**: deploy-support@abzgroup.com
- **GitHub**: Open an issue

---

**Last Updated**: 2025-10-16  
**Status**: ✅ Production Ready

