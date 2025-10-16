# Roadmap - Timesheet Manager

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
- ✅ Total: 41 tests passing
- ✅ Test infrastructure (Vitest + Testing Library)

## In Progress / Planned Phases

### Phase 13: Inline Editing & UI Highlights
**Status**: STARTED ✓
**Deliverables**:
- [x] PATCH endpoint for entry editing
- [x] AnnotatedFieldHighlight component
- [x] AnnotatedEntryList component with field-level highlights
- [ ] Integration with manager review page
- [ ] Edit modal/inline form
- [ ] Validation and error handling
- [ ] Tests for inline editing

**Timeline**: 1-2 days

### Phase 14: Admin Panel (Multi-tenant, Users, Groups, Delegations)
**Status**: NOT STARTED
**Deliverables**:
- [ ] Admin dashboard layout
- [ ] Tenant/Client CRUD
- [ ] User management (create, edit, delete, roles)
- [ ] Group management
- [ ] Manager delegation UI
- [ ] Admin endpoints with RLS
- [ ] Tests for admin operations

**Timeline**: 3-4 days

### Phase 15: Export/Import (JSON/CSV) with Validation
**Status**: NOT STARTED
**Deliverables**:
- [ ] GET /api/export?format=json|csv endpoint
- [ ] POST /api/import endpoint with dry-run
- [ ] Schema validation
- [ ] Inconsistency reporting
- [ ] Tenant isolation in exports
- [ ] Tests for export/import flows

**Timeline**: 2-3 days

### Phase 16: Reports & Advanced Filters
**Status**: NOT STARTED
**Deliverables**:
- [ ] Reports dashboard
- [ ] Filters: period, vessel, embarcation, status
- [ ] CSV/PDF export
- [ ] Aggregation queries
- [ ] Performance optimization

**Timeline**: 2-3 days

### Phase 17: Web Push (opt-in) & Notification Preferences
**Status**: NOT STARTED
**Deliverables**:
- [ ] VAPID key generation
- [ ] Service worker registration
- [ ] Push notification opt-in UI
- [ ] Notification preferences panel
- [ ] Push notification dispatcher
- [ ] Tests for push notifications

**Timeline**: 2-3 days

### Phase 18: Invoice Generator Integration (Data Contract)
**Status**: NOT STARTED
**Deliverables**:
- [ ] Define DTO/data contract
- [ ] Export endpoint aligned with OMEGA mapping
- [ ] Validation against invoice generator schema
- [ ] Integration tests
- [ ] Documentation

**Timeline**: 1-2 days

### Phase 19: UX Polish, Accessibility & Mobile Responsiveness
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

