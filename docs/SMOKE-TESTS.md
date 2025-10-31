# Smoke Tests Checklist

**Last Updated**: 2025-10-16  
**Version**: 1.0

## Overview

This document provides a comprehensive checklist for smoke testing the Timesheet Manager before release.

## Test Environment

- **URL**: https://your-staging-domain.vercel.app
- **Test Users**:
  - Employee: `employee@test.com` / `Test123!`
  - Manager: `manager@test.com` / `Test123!`
  - Admin: `admin@test.com` / `Test123!`

## Pre-Test Setup

- [ ] Staging environment deployed
- [ ] Database seeded with test data
- [ ] SMTP configured and working
- [ ] Push notifications enabled
- [ ] All environment variables set

## 1. Authentication Tests

### 1.1 Sign Up
- [ ] Navigate to sign up page
- [ ] Enter valid email and password
- [ ] Submit form
- [ ] Verify email sent (check inbox)
- [ ] Click confirmation link
- [ ] Verify redirect to dashboard

### 1.2 Sign In
- [ ] Navigate to sign in page
- [ ] Enter valid credentials
- [ ] Submit form
- [ ] Verify redirect to dashboard
- [ ] Verify user name displayed

### 1.3 Sign Out
- [ ] Click sign out button
- [ ] Verify redirect to login page
- [ ] Verify cannot access protected pages

### 1.4 Password Reset
- [ ] Click "Forgot Password"
- [ ] Enter email address
- [ ] Submit form
- [ ] Verify email sent
- [ ] Click reset link
- [ ] Enter new password
- [ ] Verify can sign in with new password

### 1.5 Session Management
- [ ] Sign in
- [ ] Wait 1 hour (or adjust session timeout)
- [ ] Verify session refreshed automatically
- [ ] Verify no unexpected logouts

## 2. Employee Flow Tests

### 2.1 View Timesheets
- [ ] Sign in as employee
- [ ] Navigate to timesheets page
- [ ] Verify list of timesheets displayed
- [ ] Verify correct period dates
- [ ] Verify status badges (draft, submitted, approved, rejected)

### 2.2 Create Entry
- [ ] Open timesheet
- [ ] Click "Add Entry"
- [ ] Select date
- [ ] Select type (boarding, disembarking, transfer)
- [ ] Enter start time
- [ ] Enter end time
- [ ] Add notes (optional)
- [ ] Click "Save"
- [ ] Verify entry appears in list
- [ ] Verify hours calculated correctly

### 2.3 Edit Entry
- [ ] Click edit icon on entry
- [ ] Modify time or notes
- [ ] Click "Save"
- [ ] Verify changes saved
- [ ] Verify hours recalculated

### 2.4 Delete Entry
- [ ] Click delete icon on entry
- [ ] Confirm deletion
- [ ] Verify entry removed from list

### 2.5 Submit Timesheet
- [ ] Add at least one entry
- [ ] Click "Submit for Approval"
- [ ] Confirm submission
- [ ] Verify status changed to "Submitted"
- [ ] Verify cannot edit entries
- [ ] Verify email sent to manager

### 2.6 View Rejected Timesheet
- [ ] Open rejected timesheet
- [ ] Verify rejection reason displayed
- [ ] Verify annotations visible
- [ ] Verify can edit entries
- [ ] Verify can resubmit

## 3. Manager Flow Tests

### 3.1 View Pending Timesheets
- [ ] Sign in as manager
- [ ] Navigate to pending timesheets
- [ ] Verify list of submitted timesheets
- [ ] Verify employee names
- [ ] Verify period dates
- [ ] Verify entry counts

### 3.2 Review Timesheet
- [ ] Click on pending timesheet
- [ ] Verify employee details
- [ ] Verify all entries displayed
- [ ] Verify hours calculated
- [ ] Verify can scroll through entries

### 3.3 Add Annotations
- [ ] Click "Add Annotation" on entry
- [ ] Select field (date, time, notes)
- [ ] Enter comment
- [ ] Click "Save"
- [ ] Verify annotation appears
- [ ] Add multiple annotations
- [ ] Verify all annotations saved

### 3.4 Approve Timesheet
- [ ] Review timesheet
- [ ] Click "Approve"
- [ ] Add optional message
- [ ] Confirm approval
- [ ] Verify status changed to "Approved"
- [ ] Verify email sent to employee
- [ ] Verify timesheet removed from pending list

### 3.5 Reject Timesheet
- [ ] Review timesheet
- [ ] Add annotations (required)
- [ ] Click "Reject"
- [ ] Enter rejection reason
- [ ] Confirm rejection
- [ ] Verify status changed to "Rejected"
- [ ] Verify email sent to employee with annotations
- [ ] Verify timesheet removed from pending list

## 4. Notification Tests

### 4.1 Email Notifications
- [ ] Submit timesheet as employee
- [ ] Verify manager receives email
- [ ] Check email content (correct language, links work)
- [ ] Approve timesheet as manager
- [ ] Verify employee receives email
- [ ] Reject timesheet as manager
- [ ] Verify employee receives email with annotations

### 4.2 Push Notifications (if enabled)
- [ ] Enable push notifications in settings
- [ ] Grant browser permission
- [ ] Submit timesheet
- [ ] Verify push notification received
- [ ] Click notification
- [ ] Verify redirects to correct page

### 4.3 Notification Preferences
- [ ] Navigate to settings
- [ ] Toggle email notifications
- [ ] Toggle push notifications
- [ ] Save preferences
- [ ] Verify preferences saved
- [ ] Test notifications respect preferences

## 5. Reports Tests

### 5.1 Summary Report
- [ ] Navigate to reports page
- [ ] Select "Summary Report"
- [ ] Select date range
- [ ] Select status filter (optional)
- [ ] Click "Generate"
- [ ] Verify report displays:
  - Total timesheets
  - Total entries
  - Total hours
  - Breakdown by status
  - Employee summaries

### 5.2 Detailed Report
- [ ] Select "Detailed Report"
- [ ] Select date range
- [ ] Select employee filter (optional)
- [ ] Click "Generate"
- [ ] Verify report displays:
  - All timesheets in range
  - All entries per timesheet
  - Hours per entry
  - Notes and annotations

### 5.3 Export CSV
- [ ] Generate report
- [ ] Click "Export CSV"
- [ ] Verify file downloads
- [ ] Open CSV file
- [ ] Verify data correct
- [ ] Verify headers present

### 5.4 Export JSON
- [ ] Generate report
- [ ] Click "Export JSON"
- [ ] Verify file downloads
- [ ] Open JSON file
- [ ] Verify valid JSON format
- [ ] Verify data structure correct

## 6. Invoice Tests

### 6.1 Generate Invoice
- [ ] Navigate to approved timesheet
- [ ] Click "Generate Invoice"
- [ ] Select format (JSON, CSV, PDF)
- [ ] Select rate type (daily, hourly)
- [ ] Enter rate value
- [ ] Select currency (GBP, USD, BRL)
- [ ] Enter cost center (optional)
- [ ] Enter call-off (optional)
- [ ] Add notes (optional)
- [ ] Click "Generate"
- [ ] Verify invoice generated

### 6.2 Validate Invoice Data
- [ ] Verify employee details correct
- [ ] Verify vessel information
- [ ] Verify period dates
- [ ] Verify work metrics:
  - Day count
  - Regular hours
  - Overtime hours
- [ ] Verify rate calculation
- [ ] Verify total amount

### 6.3 Export Invoice
- [ ] Export as JSON
- [ ] Verify JSON structure matches OMEGA format
- [ ] Export as CSV
- [ ] Verify CSV columns correct
- [ ] Export as PDF (if implemented)
- [ ] Verify PDF formatting

## 7. Admin Tests

### 7.1 Manage Users
- [ ] Sign in as admin
- [ ] Navigate to users page
- [ ] View list of users
- [ ] Create new user
- [ ] Edit user details
- [ ] Change user role
- [ ] Deactivate user
- [ ] Reactivate user

### 7.2 Manage Tenants
- [ ] Navigate to tenants page
- [ ] View list of tenants
- [ ] Create new tenant
- [ ] Edit tenant settings
- [ ] Deactivate tenant
- [ ] Reactivate tenant

### 7.3 View System Logs (if implemented)
- [ ] Navigate to logs page
- [ ] View recent activity
- [ ] Filter by user
- [ ] Filter by action
- [ ] Filter by date range

## 8. Internationalization Tests

### 8.1 Portuguese (pt-BR)
- [ ] Set locale to pt-BR
- [ ] Verify all UI text in Portuguese
- [ ] Verify date format (DD/MM/YYYY)
- [ ] Verify currency format (R$)
- [ ] Verify email templates in Portuguese

### 8.2 English (en-GB)
- [ ] Set locale to en-GB
- [ ] Verify all UI text in English
- [ ] Verify date format (DD/MM/YYYY)
- [ ] Verify currency format (£)
- [ ] Verify email templates in English

### 8.3 Locale Persistence
- [ ] Change locale
- [ ] Sign out
- [ ] Sign in
- [ ] Verify locale persisted

## 9. Responsive Design Tests

### 9.1 Mobile (375px)
- [ ] Test on iPhone SE
- [ ] Verify layout responsive
- [ ] Verify touch targets adequate (44x44px)
- [ ] Verify no horizontal scroll
- [ ] Test all critical flows

### 9.2 Tablet (768px)
- [ ] Test on iPad
- [ ] Verify layout responsive
- [ ] Verify navigation works
- [ ] Test all critical flows

### 9.3 Desktop (1920px)
- [ ] Test on large screen
- [ ] Verify layout not stretched
- [ ] Verify max-width constraints
- [ ] Test all critical flows

## 10. Cross-Browser Tests

### 10.1 Chrome
- [ ] Test all critical flows
- [ ] Verify no console errors
- [ ] Verify performance acceptable

### 10.2 Firefox
- [ ] Test all critical flows
- [ ] Verify no console errors
- [ ] Verify performance acceptable

### 10.3 Safari
- [ ] Test all critical flows
- [ ] Verify no console errors
- [ ] Verify performance acceptable
- [ ] Test push notifications (requires permission)

### 10.4 Edge
- [ ] Test all critical flows
- [ ] Verify no console errors
- [ ] Verify performance acceptable

## 11. Performance Tests

### 11.1 Page Load Times
- [ ] Dashboard: < 2s
- [ ] Timesheet list: < 2s
- [ ] Timesheet detail: < 2s
- [ ] Reports: < 3s

### 11.2 Lighthouse Audit
- [ ] Run Lighthouse audit
- [ ] Performance: 90+
- [ ] Accessibility: 90+
- [ ] Best Practices: 90+
- [ ] SEO: 90+

## 12. Security Tests

### 12.1 Authentication
- [ ] Verify cannot access protected pages without login
- [ ] Verify session expires after timeout
- [ ] Verify CSRF protection

### 12.2 Authorization
- [ ] Verify employee cannot access manager pages
- [ ] Verify manager cannot access admin pages
- [ ] Verify users can only see their own data

### 12.3 Data Validation
- [ ] Test SQL injection attempts
- [ ] Test XSS attempts
- [ ] Verify input sanitization

## Test Results

**Date**: ___________  
**Tester**: ___________  
**Environment**: ___________

**Pass Rate**: _____ / _____ (____%)

**Critical Issues**: ___________

**Non-Critical Issues**: ___________

**Notes**: ___________

---

**Status**: Ready for v1.0.0 release when all tests pass ✅

