# Troubleshooting Guide

**Last Updated**: 2025-10-16

## Common Issues and Solutions

### Build Issues

#### Issue: TypeScript Errors During Build

**Symptoms**:
```
Type error: Property 'X' does not exist on type 'Y'
```

**Solutions**:
1. Clear TypeScript cache:
```bash
rm -rf .next
rm -rf node_modules/.cache
npm run build
```

2. Check TypeScript version:
```bash
npm list typescript
```

3. Regenerate types:
```bash
npm run type-check
```

#### Issue: Module Not Found

**Symptoms**:
```
Module not found: Can't resolve '@/components/...'
```

**Solutions**:
1. Check `tsconfig.json` paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

2. Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

#### Issue: Out of Memory During Build

**Symptoms**:
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Solutions**:
1. Increase Node.js memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

2. Add to `package.json`:
```json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  }
}
```

### Runtime Issues

#### Issue: Supabase Connection Failed

**Symptoms**:
```
Error: Invalid Supabase URL or key
```

**Solutions**:
1. Verify environment variables:
```bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

2. Check `.env.local` file exists and is loaded

3. Restart development server:
```bash
npm run dev
```

4. Verify Supabase project is active in dashboard

#### Issue: RLS Policy Blocking Queries

**Symptoms**:
```
Error: new row violates row-level security policy
```

**Solutions**:
1. Check user is authenticated:
```typescript
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);
```

2. Verify RLS policies in Supabase dashboard

3. Check tenant_id matches:
```sql
SELECT * FROM profiles WHERE user_id = auth.uid();
```

4. Temporarily disable RLS for debugging (NOT in production):
```sql
ALTER TABLE timesheets DISABLE ROW LEVEL SECURITY;
```

#### Issue: Email Notifications Not Sending

**Symptoms**:
- No emails received
- SMTP errors in logs

**Solutions**:
1. Verify SMTP credentials:
```bash
echo $SMTP_HOST
echo $SMTP_PORT
echo $SMTP_USER
```

2. Test SMTP connection:
```typescript
// Test in API route
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

await transporter.verify();
```

3. Check spam folder

4. For Gmail, ensure:
   - 2FA enabled
   - App password generated
   - "Less secure apps" NOT needed with app password

#### Issue: Push Notifications Not Working

**Symptoms**:
- Subscription fails
- Notifications not received

**Solutions**:
1. Verify VAPID keys:
```bash
echo $NEXT_PUBLIC_VAPID_PUBLIC_KEY
echo $VAPID_PRIVATE_KEY
```

2. Check service worker is registered:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(console.log);
```

3. Verify HTTPS (required for push notifications)

4. Check browser permissions:
```javascript
Notification.permission // should be "granted"
```

5. Test subscription:
```javascript
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.getSubscription();
console.log('Subscription:', subscription);
```

### Database Issues

#### Issue: Migration Failed

**Symptoms**:
```
Error: relation "table_name" already exists
```

**Solutions**:
1. Check existing tables:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

2. Drop and recreate (CAUTION: data loss):
```sql
DROP TABLE IF EXISTS table_name CASCADE;
```

3. Run migrations in order

#### Issue: Slow Queries

**Symptoms**:
- Pages load slowly
- Timeouts

**Solutions**:
1. Check query performance:
```sql
EXPLAIN ANALYZE SELECT * FROM timesheets WHERE employee_id = '...';
```

2. Add indexes:
```sql
CREATE INDEX idx_timesheets_employee_id ON timesheets(employee_id);
CREATE INDEX idx_timesheets_status ON timesheets(status);
CREATE INDEX idx_entries_timesheet_id ON timesheet_entries(timesheet_id);
```

3. Optimize queries:
```typescript
// Use select() to limit columns
const { data } = await supabase
  .from('timesheets')
  .select('id, status, periodo_ini, periodo_fim')
  .eq('employee_id', employeeId);
```

### Authentication Issues

#### Issue: Session Expired

**Symptoms**:
```
Error: JWT expired
```

**Solutions**:
1. Refresh session:
```typescript
const { data, error } = await supabase.auth.refreshSession();
```

2. Implement auto-refresh:
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed');
  }
});
```

#### Issue: Redirect Loop

**Symptoms**:
- Infinite redirects between login and dashboard

**Solutions**:
1. Check middleware logic:
```typescript
// middleware.ts
if (isAuthPage && user) {
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
if (!isAuthPage && !user) {
  return NextResponse.redirect(new URL('/login', request.url));
}
```

2. Clear cookies and localStorage

3. Check redirect URLs in Supabase Auth settings

### Testing Issues

#### Issue: Tests Failing

**Symptoms**:
```
FAIL src/__tests__/...
```

**Solutions**:
1. Run tests in watch mode to see details:
```bash
npm test -- --watch
```

2. Check test environment:
```javascript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});
```

3. Mock Supabase client:
```typescript
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));
```

### Performance Issues

#### Issue: Slow Page Load

**Symptoms**:
- High LCP (Largest Contentful Paint)
- Slow Time to Interactive

**Solutions**:
1. Use React Server Components:
```typescript
// app/page.tsx (Server Component)
export default async function Page() {
  const data = await fetchData(); // Server-side
  return <ClientComponent data={data} />;
}
```

2. Optimize images:
```typescript
import Image from 'next/image';

<Image
  src="/image.jpg"
  width={800}
  height={600}
  alt="Description"
  priority // for above-the-fold images
/>
```

3. Enable caching:
```typescript
export const revalidate = 3600; // Revalidate every hour
```

#### Issue: Large Bundle Size

**Symptoms**:
- Slow initial load
- Large JavaScript files

**Solutions**:
1. Analyze bundle:
```bash
npm run build
# Check .next/analyze/
```

2. Use dynamic imports:
```typescript
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSpinner />,
});
```

3. Remove unused dependencies:
```bash
npm install -g depcheck
depcheck
```

### Deployment Issues

#### Issue: Vercel Build Failed

**Symptoms**:
```
Error: Build failed
```

**Solutions**:
1. Check build logs in Vercel dashboard

2. Test build locally:
```bash
npm run build
```

3. Verify environment variables are set in Vercel

4. Check Node.js version matches:
```json
// package.json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### Issue: Environment Variables Not Working

**Symptoms**:
- `undefined` values in production

**Solutions**:
1. Verify variables are prefixed with `NEXT_PUBLIC_` for client-side

2. Redeploy after adding variables

3. Check variable names match exactly (case-sensitive)

### Internationalization Issues

#### Issue: Translations Not Loading

**Symptoms**:
- English text shown instead of Portuguese
- Missing translations

**Solutions**:
1. Check locale files exist:
```
messages/
├── pt-BR/
│   └── common.json
└── en-GB/
    └── common.json
```

2. Verify locale in URL:
```
/pt-BR/dashboard ✅
/dashboard ❌
```

3. Check middleware redirects:
```typescript
// middleware.ts
if (!pathname.startsWith('/pt-BR') && !pathname.startsWith('/en-GB')) {
  return NextResponse.redirect(new URL('/pt-BR' + pathname, request.url));
}
```

## Getting Help

If you can't resolve an issue:

1. **Check logs**:
   - Browser console
   - Server logs
   - Supabase logs

2. **Search GitHub issues**:
   - https://github.com/abz-group/time-sheet-manager-abz-group/issues

3. **Create an issue**:
   - Include error messages
   - Include steps to reproduce
   - Include environment details

4. **Contact support**:
   - Email: support@abzgroup.com

## Debug Mode

Enable debug logging:

```env
# .env.local
DEBUG=true
LOG_LEVEL=debug
```

```typescript
// lib/logger.ts
export function debug(message: string, data?: any) {
  if (process.env.DEBUG === 'true') {
    console.log('[DEBUG]', message, data);
  }
}
```

---

**Last Updated**: 2025-10-16  
**Status**: ✅ Comprehensive

