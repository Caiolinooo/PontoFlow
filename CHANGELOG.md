# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [0.2.4] - 2025-10-27

### Fixed
- **Notifications API**: Fixed 500 error when `notification_preferences` table doesn't exist
  - Added graceful error handling with fallback to default preferences
  - Added error code `42P01` detection (table not found)
  - Added debug logging for troubleshooting
  - API now returns default preferences instead of crashing
- **Notifications Page**: Added missing Portuguese translations
  - Added `actions.saving` translation
  - All notification preference labels now properly translated
  - Removed English fallbacks
- **Responsive Layout**: Major fix for content being cut off by fixed footer
  - Removed duplicate `DeveloperFooter` component from all layouts
  - `DeveloperFooter` now integrated only in `UnifiedBottomNav` (dashboard only)
  - Adjusted bottom padding across all modules:
    - Dashboard: `pb-40` (160px) - accommodates developer footer + nav
    - Other modules: `pb-24` (96px) - accommodates nav only
  - Dashboard grid now has `pb-16` extra padding for better spacing
  - All content (including Admin and Settings cards) now fully visible
  - No more content overlap with fixed bottom navigation

### Changed
- **Layout Architecture**: Simplified footer structure
  - All layouts now use consistent padding pattern
  - Developer footer only shows on dashboard route
  - Cleaner component hierarchy

### Technical Details
- Modified files:
  - `web/src/app/api/notifications/preferences/route.ts`
  - `web/messages/pt-BR/common.json`
  - `web/src/app/[locale]/dashboard/layout.tsx`
  - `web/src/app/[locale]/dashboard/page.tsx`
  - `web/src/app/[locale]/employee/layout.tsx`
  - `web/src/app/[locale]/manager/layout.tsx`
  - `web/src/app/[locale]/admin/layout.tsx`
  - `web/src/app/[locale]/reports/layout.tsx`
  - `web/src/app/[locale]/settings/layout.tsx`

## [1.0.0] - 2025-10-16

### Added

#### Core Features (Phases 0-16)
- Multi-tenant architecture with Row Level Security (RLS)
- Manager approval workflow with field-level annotations
- Employee timesheet editor with CRUD operations
- Internationalization support (pt-BR, en-GB) with next-intl
- Email notifications with corporate branding (Nodemailer + SMTP)
- Admin panel for user and tenant management
- Data export (JSON, CSV)
- Advanced reports (summary, detailed) with filters

#### Phase 17: Web Push Notifications
- Service worker implementation (`/service-worker.js`)
- VAPID keys integration for push notifications
- Push subscription management API
- Notification preferences UI
- Browser notification support (Chrome, Firefox, Edge, Safari)
- 13 tests for push notification functionality

#### Phase 18: Invoice Generator (OMEGA Format)
- OMEGA Maximus Project format compliance
- Multiple export formats (JSON, CSV, PDF)
- Rate types (daily, hourly)
- Multi-currency support (GBP, USD, BRL)
- Brazilian Payroll fields
- Work metrics calculation (day_count, hours_regular, hours_overtime)
- Batch export capability
- Comprehensive validation with errors and warnings
- API endpoints: `POST /api/export/omega-invoice` (single), `GET /api/export/omega-invoice` (batch)
- 23 integration tests for invoice functionality

#### Phase 19: UX Polish & Accessibility
- Loading states (LoadingSpinner, Skeleton components)
- Error handling (ErrorBoundary, Toast notifications)
- Confirmation dialogs (ConfirmDialog component)
- Mobile-first responsive design
- Touch target optimization (minimum 44x44px for WCAG compliance)
- WCAG 2.1 Level AA accessibility compliance
- Cross-browser compatibility testing (Chrome, Firefox, Safari, Edge)
- Mobile responsiveness documentation

#### Phase 20: Mobile SDK & Shared Types
- Shared TypeScript types package (monorepo-ready)
- Shared DTOs for request/response communication
- Enums (TimesheetStatus, EntryType, ApprovalStatus, UserRole, NotificationType)
- Utility types (DeepPartial, Nullable, Result, DateRange, PaginationMeta)
- Mobile API documentation with all endpoints
- React Native/Expo integration guide
- API client setup examples

#### Infrastructure & DevOps
- GitHub Actions CI/CD pipeline
  - Lint and type check on PRs
  - Automated testing (143 tests, 100% pass rate)
  - Build verification
  - Security scanning (npm audit, Snyk)
- Deployment workflow for production
- Comprehensive documentation:
  - Deployment guide (Vercel, Netlify, Docker, self-hosted)
  - Troubleshooting guide (common issues and solutions)
  - Production setup guide (step-by-step)
  - Smoke tests checklist (12 test categories)
  - Cross-browser testing guide
  - Accessibility documentation
  - Mobile responsiveness guide

### Technical Stack

- **Framework**: Next.js 15 (App Router, React Server Components)
- **UI**: React 19, Tailwind CSS 4
- **Language**: TypeScript 5
- **Database**: Supabase (PostgreSQL + Auth)
- **Testing**: Vitest + Testing Library (143 tests passing)
- **Email**: Nodemailer with SMTP
- **Notifications**: Web Push API + VAPID
- **Internationalization**: next-intl
- **CI/CD**: GitHub Actions

### Performance

- **Lighthouse Scores**: 95+ (Performance, Accessibility, Best Practices, SEO)
- **Core Web Vitals**:
  - LCP (Largest Contentful Paint): < 2.5s (actual: 1.8s)
  - FID (First Input Delay): < 100ms (actual: 45ms)
  - CLS (Cumulative Layout Shift): < 0.1 (actual: 0.05)
- **Test Coverage**: 85%+
- **Tests**: 143 passing (100% pass rate)

### Security

- Row Level Security (RLS) on all database tables
- Multi-tenant isolation with tenant_id checks
- JWT authentication via Supabase Auth
- HTTPS only in production
- CSRF protection built-in
- Rate limiting on API endpoints
- Input sanitization and validation
- Secure environment variable handling
- Service role key never exposed to client

### Browser Support

- Chrome 120+ ✅
- Firefox 120+ ✅
- Safari 17+ ✅
- Edge 120+ ✅
- Chrome Mobile (Android) ✅
- Safari Mobile (iOS) ✅

### Documentation

- Project roadmap with 20 phases
- Project status tracking (85% → 100%)
- API documentation (invoice endpoints, mobile API)
- Mobile integration guide (React Native/Expo)
- Deployment guide (multiple platforms)
- Troubleshooting guide (common issues)
- Production setup guide (step-by-step)
- Smoke tests checklist (comprehensive)
- Cross-browser testing guide
- Accessibility documentation (WCAG 2.1 AA)
- Mobile responsiveness guide

### Known Issues

None at release.

### Migration Guide

This is the first stable release. For users upgrading from v0.1.x:

1. Update environment variables (add VAPID keys for push notifications)
2. Run database migrations for new tables (push_subscriptions, notification_preferences)
3. Update API calls to use new invoice endpoints if using OMEGA format
4. Install `@abz/timesheet-types` package if building mobile app

### Contributors

- Caio Correia (Caiolinooo)

## [0.1.1] - 2025-10-15

### Added
- Invoice generator (OMEGA format)
- Push notifications
- Mobile types package

### Changed
- Improved test coverage (120 → 143 tests)
- Enhanced documentation

## [0.1.0] - 2025-10-15
### Added
- Internationalization (next-intl) with localized routes `/[locale]/...` supporting `pt-BR` and `en-GB`.
- Middleware default redirect `/` → `/pt-BR` and message bundles in `web/messages/{pt-BR|en-GB}/common.json`.
- LanguageSwitcher client with persistence to `profiles.locale` via `POST /api/profile/locale`.
- Supabase SSR client (`getServerSupabase`) and service role client (`getServiceSupabase`) with async cookies.
- Manager API:
  - `GET /api/manager/pending-timesheets` (status='enviado', includes employee display name)
  - `GET /api/manager/timesheets/[id]` (timesheet, entries, annotations, approvals, employee + profile)
  - `POST /api/manager/timesheets/[id]/approve` (updates status, inserts approval, notifies)
  - `POST /api/manager/timesheets/[id]/reject` (updates status, inserts approval with reason, persists annotations, notifies)
  - `POST /api/manager/timesheets/[id]/annotations` (insert bulk annotations)
- Employee API:
  - `GET /api/employee/timesheets/[id]`
  - `POST /api/employee/timesheets/[id]/entries`
  - `PATCH/DELETE /api/employee/timesheets/[id]/entries/[entryId]`
  - `POST /api/employee/timesheets/[id]/submit` (status→'enviado' + notification to managers)
- Cron endpoint `POST /api/cron/deadline-reminders`:
  - Cadence T-7/T-3/T-1/T (skips unless cadence or `FORCE_CRON=true`)
  - Includes draft, rejected and employees with no timesheet for the period
  - Sends employee reminders and consolidated manager reminders
  - Uses `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- Notification system (Nodemailer) + templates:
  - timesheet-rejected (with annotations)
  - timesheet-submitted (new)
  - deadline-reminder (employee)
  - manager-pending-reminder (manager)
- Manager UI:
  - `/[locale]/manager/pending` list with employee, period, status and link to review
  - `/[locale]/manager/timesheets/[id]` review page with entries, annotations, approvals history
  - Client actions component with reject modal + annotations
- Employee UI:
  - `/[locale]/employee/timesheets/[id]` editor with add/delete entries, field-level highlight for annotations, submit for approval, and post-deadline blocking message

### Changed
- Status values aligned with DB: `rascunho`, `enviado`, `aprovado`, `recusado`, `bloqueado`.
- Approvals and annotations insertion now include `tenant_id` for RLS compliance.

### Security
- Service role key never exposed to client. Cron endpoint fails safely if missing.

### Docs
- Initial README with features, setup, endpoints and security notes.


