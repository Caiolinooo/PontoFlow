# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

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


