# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **PontoFlow** (formerly ABZ Manager), a multi-tenant timesheet management system built with Next.js 14, Supabase, and TypeScript. The application supports employee timesheet submission, manager approval workflows, admin configuration, and multi-language support (pt-BR/en-GB).

## Common Commands

### Development
```bash
cd web
npm run dev              # Start development server (port 3000)
npm run dev:turbopack    # Dev with Turbopack (faster, experimental)
npm run build            # Production build
npm run start            # Start production server
```

### Quality & Testing
```bash
cd web
npm run lint             # ESLint
npm run type-check       # TypeScript type checking (no build)
npm test                 # Run Vitest tests
npm run test:ui          # Vitest UI
npm run test:coverage    # Test coverage report
```

### Important Notes
- Prefer running single tests, and not the whole test suite, for performance
- Be sure to typecheck when you’re done making a series of code changes 
- Always run `npm run type-check` before committing
- The project uses standalone output mode for production deployments
- Windows-specific webpack config exists to handle ESM URL scheme errors with `next/font`

## Architecture & Structure

### Authentication System

**Hybrid Authentication:**
- Primary: Supabase Auth (`auth.users`)
- Fallback: Custom `users_unified` table (legacy ABZ integration)
- Custom token-based sessions stored in `timesheet_session` cookie (7-day expiry)
- Token format: base64-encoded `userId:timestamp`

**Auth Flow:**
1. `signInWithCredentials()` tries Supabase Auth first
2. Falls back to `users_unified` with bcrypt password verification
3. `getUserFromToken()` reconstructs user from token on each request
4. User data aggregated from: `auth.users`, `users_unified`, `profiles`, `tenant_user_roles`, `employees`

**Key Files:**
- `src/lib/auth/custom-auth.ts` - Core authentication logic
- `src/lib/auth/server.ts` - Server-side auth helpers
- `src/middleware.ts` - Route protection and RBAC

### Multi-Tenancy

**Tenant Isolation:**
- Every user belongs to a `tenant_id` (soft isolation)
- User can have multiple tenant roles via `tenant_user_roles` table
- Admins can switch tenants using `TenantSwitcher` component
- Active tenant stored in `user.user_metadata.selected_tenant_id`

**RLS (Row Level Security):**
- Enforced at database level in Supabase
- Service role key bypasses RLS (use carefully, only in admin operations)
- Regular operations use anon key with RLS enabled

### Database Clients

**Three Supabase clients:**
1. `getSupabase()` - Client-side, anon key (web/src/lib/supabase/client.ts)
2. `getServerSupabase()` - Server-side SSR with cookie handling (web/src/lib/supabase/server.ts)
3. `getServiceSupabase()` - Server-side admin with service role key (bypasses RLS)

**When to use each:**
- Client components → `getSupabase()`
- Server components/API routes → `getServerSupabase()` for user operations
- Admin operations (migrations, user management) → `getServiceSupabase()`

### API Routes Structure

All API routes follow Next.js 14 App Router conventions in `src/app/api/`:

- `/api/auth/*` - Authentication (signin, signup, signout, reset-password)
- `/api/employee/*` - Employee operations (timesheets, entries, environments)
- `/api/manager/*` - Manager operations (pending queue, approve/reject, annotations)
- `/api/admin/*` - Admin panel (users, tenants, config, migrations, delegations)
- `/api/notifications/*` - Notification system (in-app, email, preferences)
- `/api/reports/*` - Report generation and export
- `/api/cron/*` - Scheduled tasks (deadline reminders, period locking)

**API Response Pattern:**
```typescript
return NextResponse.json({ success: true, data: {...} }, { status: 200 });
return NextResponse.json({ success: false, error: 'message' }, { status: 400 });
```

### Middleware & RBAC

**Route Protection:**
- Protected routes: `/dashboard`, `/employee`, `/manager`, `/reports`, `/settings`, `/admin`
- Public routes: `/auth/*`
- Middleware handles locale extraction, auth checks, and role-based redirects

**Role Hierarchy:**
- `ADMIN` - Full system access, can switch tenants
- `TENANT_ADMIN` - Tenant-level admin
- `MANAGER` - Approve timesheets for delegated groups
- `MANAGER_TIMESHEET` - Read-only manager access
- `USER` - Employee-level access

**Access Control:**
- `/admin/*` - ADMIN only
- `/manager/*` - ADMIN, MANAGER, MANAGER_TIMESHEET
- Validated in middleware (src/middleware.ts) and individual API routes

### Internationalization (i18n)

**next-intl Setup:**
- Locales: `pt-BR` (default), `en-GB`
- Routing: `/pt-BR/*`, `/en-GB/*`
- Messages: `web/messages/{locale}/common.json`
- Request handler: `src/i18n/request.ts`
- User locale preference stored in `profiles.locale`

**Usage in Components:**
```typescript
import { useTranslations } from 'next-intl';
const t = useTranslations('namespace');
```

### Notification System

**Multi-Channel:**
1. **Email** - Nodemailer with tenant-specific SMTP config
2. **In-App** - Database-backed notifications with `notification_preferences`
3. **Push** - Web Push API with VAPID keys (optional)

**Email Templates:**
- Located in `src/lib/notifications/templates/`
- Use `emailLayout()` wrapper for consistent branding
- Bilingual support (pt-BR/en-GB)
- Templates: `timesheet-submitted`, `timesheet-approved`, `timesheet-rejected`, `deadline-reminder`, `manager-pending-reminder`

**Notification Dispatcher:**
- `src/lib/notifications/dispatcher.ts` - Email notifications
- `src/lib/notifications/in-app-dispatcher.ts` - In-app notifications
- `src/lib/notifications/unified-notification-service.ts` - Unified interface

### Timesheet Workflow

**States:**
- `Rascunho` (Draft) - Employee editing
- `Submetido` (Submitted) - Awaiting manager review
- `Aprovado` (Approved) - Manager approved
- `Recusado` (Rejected) - Manager rejected with annotations
- `Bloqueado` (Locked) - Period closed, immutable

**Entry Fields:**
- `work_date`, `environment_id`, `hours_worked`, `overtime_hours`
- Annotations: `manager_notes`, `admin_notes`
- Acknowledgment system for employee-manager communication

**Key APIs:**
- `POST /api/employee/timesheets` - Create/edit entries
- `POST /api/employee/timesheets/[id]/submit` - Submit for review
- `POST /api/manager/timesheets/[id]/approve` - Manager approval
- `POST /api/manager/timesheets/[id]/reject` - Manager rejection with notes

### Database Migrations

**Location:** `web/migrations/*.sql`

**Types:**
1. Schema migrations (CREATE TABLE, ALTER TABLE)
2. Data migrations (INSERT, UPDATE)
3. Fix migrations (FIX-*.sql for hotfixes)
4. Diagnostic queries (DIAGNOSE-*.sql)

**Important:**
- Never hardcode UUIDs in migrations (they regenerate on each Supabase instance)
- Use `apply_migration` API for DDL operations
- Test migrations on a dev branch before production

### ABZ Group Integration

**Legacy System Sync:**
- Controlled by `ENABLE_USERS_UNIFIED_SYNC` environment variable
- Default: `false` (disabled for new clients)
- When enabled: Syncs users to `users_unified` table for legacy ABZ Painel integration
- Triggers: `SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-ABZ.sql`

**Important:** New clients should disable this sync. It's ABZ Group-specific.

### Windows Development Notes

**Known Issues:**
1. **next/font ESM URL scheme error** - Fixed in `next.config.ts` with webpack config
2. **lightningcss Windows binary** - `lightningcss-win32-x64-msvc` added as dependency
3. **Tailwind v4 PostCSS** - Uses `@tailwindcss/postcss` with custom config

**Webpack Config:**
- Custom extension alias for `.js` → `.ts/.tsx` resolution
- Fallback for `fs` and `path` in client bundles

### Component Architecture

**UI Components:** `src/components/ui/`
- Base components: `Button`, `Card`, `Modal`, `Table`, `LoadingSpinner`
- Dark mode support via CSS variables
- Toast notifications via `ToastProvider`

**Feature Components:**
- `src/components/admin/` - Admin panel components
- `src/components/employee/` - Employee dashboard
- `src/components/manager/` - Manager review interface
- `src/components/notifications/` - Notification UI
- `src/components/reports/` - Report generation

**Layout Components:**
- `Header` - Main navigation with tenant switcher
- `AdminNav` - Contextual admin sub-navigation
- `UnifiedBottomNav` - Mobile bottom navigation
- `AppShell` - Wraps pages with providers

### Styling System

**Tailwind v4:**
- Configuration in `web/tailwind.config.ts` (minimal, most config in CSS)
- Dark mode: class-based (`dark:` prefix)
- CSS variables in `src/app/globals.css`:
  - `--primary`, `--secondary`, `--background`, `--foreground`
  - `--destructive`, `--muted`, `--accent`, `--border`

**Theme Toggle:**
- Cookie: `theme=dark|light`
- Synced to `profiles.ui_theme`
- No-FOUC script in `layout.tsx`

### Testing

**Vitest Configuration:**
- Config: `web/vitest.config.ts`
- Setup: `web/vitest.setup.ts`
- Environment: jsdom
- Tests: `src/__tests__/`

**Coverage:**
- Provider: v8
- Reporters: text, json, html
- Excludes: node_modules, setup files

### Reports & Export

**Formats:**
- CSV - Quick export with proper escaping
- JSON - Normalized data structure
- Excel - `exceljs` for .xlsx generation
- PDF - `pdfkit` + `puppeteer` for invoice generation (optional)

**Report Types:**
- Summary reports (status counts)
- Detailed reports (entries + annotations)
- Invoice generation (Omega format for ABZ Group)

**Key Files:**
- `src/lib/reports/generator.ts` - Core report logic
- `src/lib/reports/excel-generator.ts` - Excel export
- `src/lib/reports/pdf-generator.ts` - PDF generation

### Environment Variables

**Required:**
```bash
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=        # Service role key (admin)
```

**Optional:**
```bash
ENABLE_USERS_UNIFIED_SYNC=true    # Enable ABZ legacy sync (default: false)
```

### Deployment

**Build Output:**
- Mode: `standalone` (self-contained)
- Target: Node.js ≥18.17.0
- Build command: `npm run build`
- Start command: `npm run start`

**Production Checklist:**
1. Set all environment variables
2. Run `npm run type-check`
3. Run `npm test`
4. Run `npm run build`
5. Verify `.next/standalone` output

### Common Patterns

**Server Component Data Fetching:**
```typescript
import { getApiUser } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

export default async function Page() {
  const user = await getApiUser();
  if (!user) redirect('/auth/signin');

  const supabase = await getServerSupabase();
  const { data } = await supabase.from('table').select('*');
  // ...
}
```

**API Route Authentication:**
```typescript
import { getApiUser } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... role checks, tenant isolation
}
```

**Client-Side Data Mutation:**
```typescript
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
const result = await response.json();
if (!result.success) {
  // handle error
}
```

### Debugging Tips

**Authentication Issues:**
- Check browser console for `[AUTH]` logs
- Verify `timesheet_session` cookie exists
- Check token expiry (7 days max)
- Confirm user exists in `users_unified` OR `auth.users`

**Supabase Queries:**
- Use `.explain()` for query analysis
- Check RLS policies if data missing
- Use service role client for admin operations
- Monitor Supabase logs for RLS violations

**Build Errors:**
- Windows: Ensure `lightningcss-win32-x64-msvc` installed
- Font errors: Check webpack config in `next.config.ts`
- Type errors: Run `npm run type-check` for detailed output

### Performance Considerations

**Caching:**
- Redis-backed cache service (`src/lib/cache/service.ts`)
- Used for expensive queries and report generation

**Offline Support:**
- IndexedDB storage (`src/lib/offline/storage.ts`)
- Service Worker registration (`ServiceWorkerRegistrar` component)

**Monitoring:**
- Performance tracker (`src/lib/monitoring/performance.ts`)
- Audit logger (`src/lib/audit/logger.ts`)
