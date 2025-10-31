# Roadmap - Timesheet Manager

**Last Updated**: 2025-10-16
**Status**: 85% Complete (Phases 0-17 Complete, Phase 18 80%)
**Next Milestone**: v1.0.0

## Completed Phases ✅

### Phase 0-10: Foundation & Core Features

- ✅ i18n infrastructure (pt-BR/en-GB)
- ✅ Multi-tenant architecture with RLS
- ✅ Manager approval workflow with annotations
- ✅ Employee timesheet editor
- ✅ Notification system (email, in-app)
- ✅ Deadline reminders and blocking
- ✅ Audit trail and approvals history

### Phase 11: Corporate Email Standardization

- ✅ Email layout with ABZ branding
- ✅ All 5 email templates updated
- ✅ Logo and color palette integration
- ✅ Bilingual support in all emails
- ✅ Email client compatibility

### Phase 12: Integration Tests

- ✅ Timesheet workflow tests (15 tests)
- ✅ Component tests (8 tests)
- ✅ Email template tests (18 tests)
- ✅ Total: 120 tests passing
- ✅ Test infrastructure (Vitest + Testing Library)

### Phase 13: Inline Editing & UI Highlights ✅

**Status**: COMPLETE
**Deliverables**:

- ✅ PATCH endpoint for entry editing
- ✅ AnnotatedFieldHighlight component
- ✅ AnnotatedEntryList component with field-level highlights
- ✅ Integration with manager review page
- ✅ Validation and error handling
- ✅ Tests for inline editing

### Phase 14: Admin Panel ✅

**Status**: COMPLETE

**Deliverables**:

- ✅ Admin dashboard layout
- ✅ Tenant/Client CRUD
- ✅ User management (create, edit, delete, roles)
- ✅ Group management
- ✅ Manager delegation UI
- ✅ Admin endpoints with RLS
- ✅ Tests for admin operations

### Phase 15: Export/Import ✅

**Status**: COMPLETE

**Deliverables**:

- ✅ GET /api/export?format=json|csv endpoint
- ✅ POST /api/import endpoint with dry-run
- ✅ Schema validation
- ✅ Inconsistency reporting
- ✅ Tenant isolation in exports
- ✅ Tests for export/import flows

### Phase 16: Reports & Advanced Filters ✅

**Status**: COMPLETE

**Deliverables**:

- ✅ Reports dashboard
- ✅ Filters: period, vessel, embarcation, status
- ✅ CSV/JSON export
- ✅ Aggregation queries
- ✅ 12 tests passing

### Phase 17: Web Push & Notification Preferences ✅

**Status**: COMPLETE

**Deliverables**:

- ✅ VAPID key generation
- ✅ Service worker registration (`web/public/service-worker.js`)
- ✅ Push notification opt-in UI
- ✅ Notification preferences panel (`PreferencesPanel.tsx`)
- ✅ Push notification dispatcher
- ✅ 13 tests passing

## In Progress

### Phase 18: Invoice Generator Integration (80% Complete)

**Status**: IN PROGRESS

**Deliverables**:

- ✅ Define DTO/data contract (`lib/invoice/types.ts`)
- ✅ Invoice generator (`lib/invoice/generator.ts`)
- ✅ Export endpoint aligned with OMEGA mapping (`/api/export/invoice`)
- ✅ Validation against invoice generator schema
- ✅ 17 tests passing
- ⏳ Align with OMEGA mapping (docs/export/OMEGA-mapping-v1.md)
- ⏳ Document invoice API endpoints
- ⏳ End-to-end integration tests

**Timeline**: 1-2 days remaining

## Planned Phases

### Phase 19: UX Polish & Accessibility

**Status**: NOT STARTED

**Deliverables**:

- [ ] Loading states and skeletons
- [ ] Error handling and user feedback
- [ ] Confirmation dialogs for destructive actions
- [ ] WCAG 2.1 AA compliance
- [ ] Mobile responsiveness testing
- [ ] Accessibility audit

**Timeline**: 2-3 days

### Phase 20: Mobile SDK & Shared Types

**Status**: NOT STARTED

**Deliverables**:

- [ ] Extract types into @abz/timesheet-types package
- [ ] Create shared DTOs
- [ ] Document APIs for mobile consumption
- [ ] React Native/Expo compatibility guide
- [ ] Example mobile app structure

**Timeline**: 2-3 days

## Summary

**Total Phases**: 20
**Completed**: 12 (60%)
**Remaining**: 8 (40%)
**Estimated Timeline**: 2-3 weeks for full completion

## Key Metrics

- **Test Coverage**: 41 tests passing (Phase 12)
- **i18n Support**: pt-BR, en-GB (all features)
- **Multi-tenant**: ✅ Implemented with RLS
- **Email Templates**: 5 corporate templates
- **API Endpoints**: 15+ endpoints
- **Components**: 10+ React components

## Next Immediate Steps

1. Complete Phase 13 (inline editing)
2. Implement Phase 14 (admin panel)
3. Add Phase 15 (export/import)
4. Continue with remaining phases

## Notes

- All phases follow Conventional Commits
- Each phase includes tests
- i18n support mandatory for all features
- Multi-tenant isolation enforced at RLS level
- Corporate branding consistent across all UIs

