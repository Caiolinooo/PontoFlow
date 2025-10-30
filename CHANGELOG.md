# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [0.2.5] - 2025-10-30

### Added
- **Manager Team Overview**: Complete visibility of all team members' timesheet status
  - New API endpoint `GET /api/manager/team-timesheets` with derived status logic
  - Shows all employees in manager's groups with status: pendente, rascunho, enviado, aprovado, recusado
  - Month filter (YYYY-MM format) to view any period
  - Status counters in header (total, pending, draft, submitted, approved, rejected)
  - Color-coded status badges for quick visual identification
- **Manager Notification System**: Direct employee notification capability
  - New API endpoint `POST /api/manager/notify-employee` for sending reminders
  - "Notify" button for employees with pending/draft status
  - Visual feedback (loading, success, error states) on notification button
  - Email sent using existing `deadline_reminder` template
  - Respects employee's locale preference (pt-BR/en-GB)
  - Audit trail in `notification_log` table
- **Enhanced In-App Alerts**: Dashboard alerts with full i18n support
  - Manager alerts: Team summary with pending/draft counts and CTA to pending page
  - Employee alerts: Not started or draft status with CTA to timesheets
  - All alert messages use i18n keys with parameterized translations
  - Action buttons with localized labels
- **Improved Notification Cadence**: More frequent deadline reminders
  - Updated from T-7, T-3, T-1, T to T-7, T-5, T-3, T-2, T-1, T
  - Ensures managers receive reminders on day 29 (when deadline is day 1 of next month)
  - Better coverage for end-of-month scenarios
- **Enhanced Notification System**: Dual notification delivery (email + in-app)
  - New `dispatchEnhancedNotification` function for combined delivery
  - Approval notifications now sent via both email and in-app
  - Rejection notifications now sent via both email and in-app
  - Better user engagement with multiple notification channels

### Changed
- **Manager Pending Page**: Complete redesign with comprehensive team view
  - Renamed from "Pendências" to show all team timesheets, not just submitted ones
  - Added month filter form with apply/clear buttons
  - Added 6 status counter cards at top of page
  - Status column now shows translated labels with color-coded badges
  - Actions column includes both "Review" and "Notify" buttons where applicable
  - Better responsive layout for filters and counters
- **API Authorization**: Improved manager authorization pattern
  - Consistent use of `manager_id` (not `manager_user_id`) across all endpoints
  - ADMIN role can access all employees in tenant
  - MANAGER/MANAGER_TIMESHEET roles limited to assigned groups
  - Service role Supabase client used for proper RLS bypass where needed

### Fixed
- **Manager Authorization Bugs**: Fixed incorrect column references
  - Changed `manager_user_id` to `manager_id` in multiple endpoints
  - Fixed manager group assignment queries
  - Proper employee membership checks
- **API Response Structure**: Alerts API now returns i18n keys instead of hardcoded messages
  - Enables proper translation on client side
  - Supports parameterized messages (e.g., {pending}, {draft}, {month})
- **Translation Coverage**: Added missing translations for all new features
  - `manager.pending.filters.*` - Month filter labels
  - `manager.pending.counters.*` - Status counter labels
  - `manager.pending.statusLabels.*` - Status badge translations
  - `manager.pending.notifyEmployee` - Notification button states
  - `dashboard.alerts.*` - Alert messages for manager and employee
  - All translations available in both pt-BR and en-GB

### Technical Details
- **New Files**:
  - `web/src/app/api/manager/team-timesheets/route.ts` - Team overview API
  - `web/src/app/api/manager/notify-employee/route.ts` - Employee notification API
  - `web/src/components/manager/NotifyEmployeeButton.tsx` - Client notification button
  - `web/src/lib/notifications/in-app-dispatcher.ts` - Enhanced notification dispatcher
- **Modified Files**:
  - `web/src/app/[locale]/manager/pending/page.tsx` - Complete redesign
  - `web/src/app/[locale]/dashboard/page.tsx` - Integrated AlertBanner
  - `web/src/app/api/notifications/alerts/route.ts` - i18n key response structure
  - `web/src/app/api/cron/deadline-reminders/route.ts` - Updated cadence
  - `web/src/app/api/manager/timesheets/[id]/approve/route.ts` - Enhanced notifications
  - `web/src/app/api/manager/timesheets/[id]/reject/route.ts` - Enhanced notifications
  - `web/src/components/AlertBanner.tsx` - Translation support
  - `web/messages/pt-BR/common.json` - Added 20+ new translation keys
  - `web/messages/en-GB/common.json` - Added 20+ new translation keys

### Security
- Manager notification endpoint properly validates group membership
- ADMIN bypass only for users with ADMIN role
- Service role key used only on server-side
- All notifications respect tenant isolation

### Performance
- Team overview API optimized with single query for all employees
- Derived status calculated efficiently on backend
- Month filter reduces data transfer for historical views

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

## [0.2.3] - 2025-10-27

### Fixed
- **Developer Information**: Corrected all developer contact details
  - Instagram: @tal_do_goulart
  - LinkedIn: https://www.linkedin.com/in/caio-goulart/
  - Email: Caiovaleriogoulartcorreia@gmail.com
  - Updated in both `DeveloperFooter` and `UnifiedBottomNav`

### Added
- **Role-Based Statistics**: Dashboard now shows different stats based on user role
  - **Admin/Manager**: Horas este mês, Aprovados, Pendentes
  - **Employee (Offshore)**: Horas este mês, Horas Extras (50%), Dobra (100%)
  - Compliant with offshore work regulations (CLT Article 74, Portaria MTP 671/2021)
- **Integrated Footer**: Developer footer now integrated into bottom navigation bar
  - Only visible on dashboard route
  - Compact design with all information
  - Better space utilization

### Changed
- **Enhanced Dashboard Cards**: Premium styling applied to all module cards
  - Gradient backgrounds (from-card to-card/80)
  - Multiple hover effects:
    - Elevation animation (-translate-y-1)
    - Enhanced shadows (shadow-2xl)
    - Animated gradient overlays
    - Icon rotation (rotate-6) and scaling (scale-110)
    - Arrow indicator movement
    - Title color transition to primary
    - Border color change
  - Larger icons (w-14 h-14)
  - Rounded corners (rounded-2xl)
  - Backdrop blur effects
  - Smooth transitions (300-700ms)

### Technical Details
- Modified files:
  - `web/src/components/DeveloperFooter.tsx`
  - `web/src/components/UnifiedBottomNav.tsx`
  - `web/src/app/[locale]/dashboard/page.tsx`
  - `web/src/app/[locale]/dashboard/layout.tsx`

## [0.2.2] - 2025-10-27

### Added
- **Developer Footer**: Professional footer with developer information
  - Copyright notice with current year
  - Developer name: Caio Valério Goulart Correia
  - Email: caiovaleriogoulartcorreia@gmail.com
  - Social links: GitHub, LinkedIn, Instagram
  - Elegant icons and hover effects
  - Responsive design for mobile and desktop
  - Integrated in all layouts
- **Back to Dashboard Button**: New navigation component
  - Arrow icon with smooth hover animation
  - Meta UI inspired design
  - Automatically hidden on dashboard page
  - Added to all non-admin layouts
  - Consistent navigation experience
- **Image Upload for Branding**: Logo and watermark upload functionality
  - Logo upload with file picker
  - Watermark image upload
  - Base64 encoding for easy storage
  - Live preview of uploaded images
  - Support for URL or file upload
  - Professional file input styling
  - Integrated in `AdminTenantSettings`

### Changed
- **Enhanced Dashboard**: Beautiful gradient header and improved cards
  - Quick stats cards (hours, approved, pending)
  - Gradient backgrounds
  - Multiple hover effects (scale, translate, rotate)
  - Arrow indicators
  - Backdrop blur effects
  - Enhanced shadows and borders
  - Smooth color transitions
- **Layout Improvements**: Fixed bottom navigation positioning
  - Added flex-col layout for proper footer placement
  - Consistent padding (pb-20) for bottom nav clearance
  - Developer footer above bottom nav
  - Better content flow and spacing

### Technical Details
- Created files:
  - `web/src/components/DeveloperFooter.tsx`
  - `web/src/components/BackToDashboard.tsx`
- Modified files:
  - `web/src/components/admin/AdminTenantSettings.tsx`
  - `web/src/app/[locale]/dashboard/page.tsx`
  - All layout files (admin, dashboard, employee, manager, reports, settings)

## [0.2.1] - 2025-10-27

### Added
- **Unified Bottom Navigation Bar**: Complete UI redesign
  - Consolidated all navigation into a single bottom bar
  - Fixed bottom navigation bar with backdrop blur
  - Logo + site title on the left
  - Admin menus (when in admin routes) with dropdowns
  - Theme toggle, language switcher, user info on the right
  - Tenant switcher (admin only)
  - Responsive design for mobile and desktop
- **Context-Aware Navigation**: Smart menu display
  - Shows admin menus only when in `/admin` routes
  - Clean bar for employee, manager, dashboard routes
  - Dropdowns open upward from bottom bar
  - Active category highlighting

### Removed
- **Duplicate Navigation Components**: Removed Header and AdminNav from layouts
  - Cleaner interface with single navigation source
  - Better use of screen real estate
  - Consistent experience across all modules

### Changed
- **Layout Updates**: All layouts now use `UnifiedBottomNav`
  - Added `pb-16` padding to prevent content overlap
  - Integrated `TenantSwitcher` into bottom bar
  - Removed separate Header and AdminNav components

### Technical Details
- Created files:
  - `web/src/components/UnifiedBottomNav.tsx`
- Modified files:
  - All layout files (admin, dashboard, employee, manager, reports, settings)

## [0.2.0] - 2025-10-27

### Breaking Changes
- **Settings Page Restructure**: Complete reorganization with tabbed interface
- **Removed Emojis**: Professional commercial appearance throughout
- **Generic Sync Configuration**: Removed EmployeeHub-specific references
  - `EMPLOYEEHUB_SYNC_URL` → `SOURCE_SYSTEM_SYNC_URL`
  - `TIMESHEET_SYNC_URL` → `TARGET_SYSTEM_SYNC_URL`

### Added
- **Tabbed Settings Interface**: 3 main sections
  - **Status do Sistema**: Health check with visual status badges
  - **Configurações do Sistema**: System config with migration tools
  - **Configurações da Empresa**: Tenant settings
- **Enhanced Health Check System**:
  - Visual status badges for each component
  - Overall system health indicator
  - Additional environment variable checks (SMTP, Sync, API)
  - Improved error messaging and warnings
  - Better visual organization with cards
- **Integrated Migration Functionality**:
  - Export users from current system
  - Import users from external systems
  - Test connections before migration
  - HMAC SHA-256 authentication
  - JSON download for exports
  - Detailed operation feedback

### Changed
- **Professional UI Improvements**:
  - Removed all emoji icons
  - Clean, corporate design
  - Better visual hierarchy
  - Consistent spacing and typography
  - Status badges and color-coded feedback
- **Separated Concerns**: Dedicated components
  - `AdminSettingsTabs` - Main tabbed interface
  - `AdminTenantSettings` - Company configuration
  - `AdminSystemConfig` - System variables and integrations
  - `AdminHealth` - Enhanced health monitoring

### Removed
- **AdminDataSync Component**: Integrated into `AdminSystemConfig`

### Technical Details
- Created files:
  - `web/src/components/admin/AdminSettingsTabs.tsx`
  - `web/src/components/admin/AdminTenantSettings.tsx`
- Modified files:
  - `web/src/components/admin/AdminHealth.tsx`
  - `web/src/components/admin/AdminSystemConfig.tsx`
  - `web/src/app/[locale]/admin/settings/page.tsx`
- Removed files:
  - `web/src/components/admin/AdminDataSync.tsx`

### Migration Notes
- No database changes required
- Environment variables remain backward compatible
- Consider updating `.env` files to use new generic variable names

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


