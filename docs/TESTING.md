# Testing Strategy - Timesheet Manager

## Overview

This document outlines the testing strategy for the Timesheet Manager application, covering unit tests, integration tests, and end-to-end tests.

## Test Stack

- **Unit/Integration**: Vitest + @testing-library/react
- **E2E**: Playwright (planned for Phase 12)
- **Coverage**: v8 provider with HTML reports

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm test:ui

# Generate coverage report
npm test:coverage
```

## Test Structure

### Phase 12: Integration Tests (COMPLETED ✅)

#### 1. Timesheet Workflow (`src/__tests__/api/timesheet-flow.test.ts`)

**Coverage:**
- Employee submission flow
- Manager approval/rejection flow
- Notification system
- i18n support in notifications
- RLS and multi-tenant isolation
- Deadline and blocking logic

**Test Cases:** 15 tests
- ✅ Create timesheet entry with embarque/desembarque/translado
- ✅ Submit timesheet and change status to enviado
- ✅ Validate timesheet has at least one entry
- ✅ Retrieve pending timesheets for manager
- ✅ Approve timesheet and create audit trail
- ✅ Reject timesheet with reason and annotations
- ✅ Send notifications for all events
- ✅ Support pt-BR and en-GB locales
- ✅ Isolate timesheets by tenant_id
- ✅ Enforce manager delegation by group
- ✅ Block employee editing after deadline
- ✅ Allow manager to edit after deadline

#### 2. Component Tests (`src/__tests__/components/TimesheetEditor.test.tsx`)

**Coverage:**
- TimesheetEditor UI rendering
- Annotation highlighting
- Form validation
- Deadline warnings
- Entry management
- i18n support

**Test Cases:** 8 tests
- ✅ Render timesheet editor form
- ✅ Display annotated fields with highlight
- ✅ Prevent submission if empty
- ✅ Show deadline warning
- ✅ Block editing after deadline
- ✅ Display entry list with add/delete
- ✅ Validate entry times
- ✅ Support i18n labels

#### 3. Email Templates (`src/__tests__/notifications/email-templates.test.ts`)

**Coverage:**
- All 5 email templates
- i18n support (pt-BR/en-GB)
- Corporate branding
- Email client compatibility
- Responsive design

**Test Cases:** 18 tests
- ✅ Timesheet submitted email (pt-BR/en-GB)
- ✅ Timesheet rejected email with annotations
- ✅ Timesheet approved email with success colors
- ✅ Deadline reminder with dynamic urgency
- ✅ Manager pending reminder with employee list
- ✅ ABZ logo and branding
- ✅ Gradient header
- ✅ Responsive design
- ✅ Bilingual footer
- ✅ Inline CSS for email clients
- ✅ Avoid unsupported CSS features

## Test Results

```
Test Files  3 passed (3)
Tests       41 passed (41)
Duration    3.70s
```

## Coverage Goals

- **Phase 12**: Core workflows and notifications (COMPLETED ✅)
- **Phase 13**: Inline editing and UI highlights
- **Phase 14**: Admin panel CRUD operations
- **Phase 15**: Export/Import validation
- **Phase 16**: Reports and filters
- **Phase 17**: Web Push notifications
- **Phase 18**: Invoice generator integration
- **Phase 19**: UX and accessibility
- **Phase 20**: Mobile SDK types

## Best Practices

1. **Test Organization**: Group tests by feature/component
2. **Naming**: Use descriptive test names that explain the behavior
3. **Setup/Teardown**: Use beforeEach/afterEach for common setup
4. **Mocking**: Mock external dependencies (Supabase, email service)
5. **Assertions**: Use specific assertions (not just toBeDefined)
6. **i18n**: Always test both pt-BR and en-GB locales

## Continuous Integration

Tests run automatically on:
- Pull requests to `dev` and `main`
- Commits to feature branches
- Pre-commit hook (Husky - planned)

## Future Enhancements

- [ ] E2E tests with Playwright
- [ ] Performance benchmarks
- [ ] Visual regression testing
- [ ] API contract testing
- [ ] Load testing for notifications
- [ ] Security testing (OWASP)

