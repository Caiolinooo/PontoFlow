# Database Setup Wizard - Executive Summary

## Overview

This document provides a comprehensive summary of all database components required for the PontoFlow timesheet management system. This analysis serves as the foundation for implementing an automated database setup wizard in the admin panel.

**Analysis Date:** 2025-01-05  
**System:** PontoFlow Timesheet Manager  
**Database:** PostgreSQL 15+ (Supabase)  
**Project ID:** arzvingdtnttiejcvucs  
**Region:** us-east-2

---

## Component Inventory

### Tables: 27 Total

#### Core System Tables (17)
1. `tenants` - Multi-tenant root table
2. `environments` - Work environments per tenant
3. `profiles` - User profiles (separate from auth.users)
4. `tenant_user_roles` - Role-based access control
5. `groups` - Work groups for delegation
6. `manager_group_assignments` - Manager-to-group assignments
7. `employee_group_members` - Employee-to-group assignments
8. `vessels` - Vessel/ship registry
9. `employees` - Employee records
10. `timesheets` - Timesheet headers
11. `timesheet_entries` - Individual time entries
12. `approvals` - Approval audit trail
13. `comments` - Comment system
14. `notifications` - In-app notifications
15. `timesheet_annotations` - Manager feedback
16. `password_reset_tokens` - Password reset tokens
17. `_migrations` - Migration tracking

#### Additional System Tables (10)
18. `users_unified` - Custom authentication system
19. `user_invitations` - User invitation system
20. `push_subscriptions` - Web push subscriptions (Phase 17)
21. `notification_preferences` - Notification preferences (Phase 17)
22. `notification_log` - Notification audit trail (Phase 17)
23. `period_locks` - Monthly period locks (Phase 18)
24. `audit_log` - Comprehensive audit logging
25. `tenant_settings` - Extended tenant configuration
26. `vessel_group_links` - Vessel-group associations
27. `system_config` - Global system configuration (optional)

---

### Database Functions: 12+

#### Tenant Functions (3)
- `get_tenant_timezone(tenant_uuid UUID)` → TEXT
- `get_tenant_work_mode(tenant_uuid UUID)` → TEXT
- `get_tenant_deadline_day(tenant_uuid UUID)` → INTEGER

#### Timesheet Functions (2)
- `timesheet_deadline(periodo_ini DATE, tenant_uuid UUID)` → TIMESTAMPTZ
- `timesheet_past_deadline(periodo_ini DATE, tenant_uuid UUID)` → BOOLEAN

#### Utility Functions (1)
- `canonical_month(d DATE)` → DATE

#### Trigger Functions (5)
- `handle_new_user()` - Creates profile for new auth.users
- `sync_profile_to_users_unified()` - Syncs profiles to users_unified
- `update_user_invitations_updated_at()` - Updates invitation timestamps
- `expire_old_invitations()` - Expires old invitations
- `period_locks_bu()` - Normalizes period_month and updates updated_at

#### Multi-Tenant Functions (1)
- `get_user_tenants(user_id UUID)` → TABLE
- `set_tenant_context(tenant_id UUID)` → VOID
- `get_tenant_context()` → UUID

---

### Database Triggers: 5+

1. `on_auth_user_created` ON auth.users
   - AFTER INSERT
   - Executes: `handle_new_user()`
   - Purpose: Auto-create profile for new users

2. `on_profile_sync_to_users_unified` ON profiles
   - AFTER INSERT OR UPDATE
   - Executes: `sync_profile_to_users_unified()`
   - Purpose: Sync profile changes to users_unified

3. `trg_period_locks_bu` ON period_locks
   - BEFORE INSERT OR UPDATE
   - Executes: `period_locks_bu()`
   - Purpose: Normalize period_month to first day of month

4. `update_user_invitations_updated_at` ON user_invitations
   - BEFORE UPDATE
   - Executes: `update_user_invitations_updated_at()`
   - Purpose: Auto-update updated_at timestamp

5. `set_manager_group_assignment_tenant_id` ON manager_group_assignments
   - BEFORE INSERT
   - Purpose: Auto-populate tenant_id from group

---

### PostgreSQL Extensions: 2

1. **uuid-ossp** - UUID generation functions
   - Required for: `gen_random_uuid()` default values
   - Status: Standard Supabase extension

2. **pgcrypto** - Cryptographic functions
   - Required for: Password hashing, encryption
   - Status: Standard Supabase extension

---

### Supabase Storage Buckets: 1

1. **public** (default bucket)
   - Purpose: General file storage
   - RLS: Enabled
   - Public Access: Configurable per file
   - Future Use: Medical certificate attachments

---

### Row Level Security (RLS)

**Status:** Enabled on ALL 27 tables

**Policy Patterns:**
1. **Tenant Isolation** - Users only access their tenant's data
2. **Role-Based Access** - Different permissions per role
3. **Employee Self-Access** - Employees see own data
4. **Manager Delegation** - Managers see team data via groups
5. **Admin Override** - Admins have full tenant scope access

**Roles Supported:**
- Legacy: `COLAB`, `GERENTE`, `TENANT_ADMIN`, `ADMIN_GLOBAL`
- Current: `USER`, `MANAGER_TIMESHEET`, `MANAGER`, `ADMIN`

---

### Indexes: 80+

**Performance Indexes:**
- Tenant isolation: `idx_*_tenant` on all tenant-scoped tables
- Foreign keys: Indexes on all FK columns
- Lookups: Email, slug, token, status fields
- Composite: Multi-column indexes for common queries
- Unique: Enforcing business constraints

**Critical Indexes:**
- `idx_tenants_slug` - Tenant lookup by slug
- `idx_employees_profile_tenant` - Unique employee per tenant
- `idx_timesheets_employee` - Employee timesheet lookup
- `idx_entries_timesheet` - Entry lookup by timesheet
- `idx_audit_log_resource` - Audit trail queries

---

## Dependency Order for Setup

### Layer 1: Extensions and Root Tables
**Order:** 1
**Components:**
- PostgreSQL Extensions: `uuid-ossp`, `pgcrypto`
- Table: `tenants` (no dependencies)
- Table: `_migrations` (no dependencies)
- Table: `system_config` (no dependencies)

**Rationale:** These are foundational components with no dependencies.

---

### Layer 2: User and Environment Tables
**Order:** 2
**Components:**
- Table: `profiles` (links to auth.users, but auth.users is Supabase-managed)
- Table: `users_unified` (no dependencies)
- Table: `environments` (depends on tenants)
- Table: `vessels` (depends on tenants)
- Table: `password_reset_tokens` (no FK dependencies)

**Rationale:** These tables depend only on Layer 1 or Supabase-managed tables.

---

### Layer 3: Role and Settings Tables
**Order:** 3
**Components:**
- Table: `tenant_user_roles` (depends on tenants)
- Table: `tenant_settings` (depends on tenants)
- Table: `user_invitations` (depends on users_unified)
- Table: `notification_preferences` (depends on auth.users)
- Table: `push_subscriptions` (depends on auth.users)

**Rationale:** These tables depend on Layer 1-2 tables.

---

### Layer 4: Group and Employee Tables
**Order:** 4
**Components:**
- Table: `groups` (depends on tenants, environments)
- Table: `employees` (depends on tenants, profiles, vessels)

**Rationale:** These tables depend on Layer 1-3 tables.

---

### Layer 5: Group Assignment Tables
**Order:** 5
**Components:**
- Table: `manager_group_assignments` (depends on groups, tenants)
- Table: `employee_group_members` (depends on groups, tenants)
- Table: `vessel_group_links` (depends on vessels, groups)

**Rationale:** These tables depend on Layer 4 tables (groups, employees).

---

### Layer 6: Timesheet and Period Tables
**Order:** 6
**Components:**
- Table: `timesheets` (depends on tenants, employees)
- Table: `period_locks` (depends on tenants)

**Rationale:** These tables depend on Layer 4 tables (employees).

---

### Layer 7: Timesheet Detail Tables
**Order:** 7
**Components:**
- Table: `timesheet_entries` (depends on timesheets, environments)
- Table: `approvals` (depends on timesheets)
- Table: `timesheet_annotations` (depends on timesheets, timesheet_entries)

**Rationale:** These tables depend on Layer 6 tables (timesheets).

---

### Layer 8: Communication and Audit Tables
**Order:** 8
**Components:**
- Table: `comments` (depends on tenants, but entity_id is generic)
- Table: `notifications` (depends on tenants)
- Table: `notification_log` (depends on auth.users)
- Table: `audit_log` (depends on tenants, but resource_id is generic)

**Rationale:** These tables have minimal dependencies and are used across the system.

---

### Layer 9: Database Functions
**Order:** 9
**Components:**
- All utility functions: `canonical_month`
- All tenant functions: `get_tenant_timezone`, `get_tenant_work_mode`, `get_tenant_deadline_day`
- All timesheet functions: `timesheet_deadline`, `timesheet_past_deadline`
- All trigger functions: `handle_new_user`, `sync_profile_to_users_unified`, `update_user_invitations_updated_at`, `expire_old_invitations`, `period_locks_bu`

**Rationale:** Functions must be created after all tables they reference.

---

### Layer 10: Database Triggers
**Order:** 10
**Components:**
- `on_auth_user_created` ON auth.users
- `on_profile_sync_to_users_unified` ON profiles
- `trg_period_locks_bu` ON period_locks
- `update_user_invitations_updated_at` ON user_invitations
- `set_manager_group_assignment_tenant_id` ON manager_group_assignments
- `set_employee_group_member_tenant_id` ON employee_group_members

**Rationale:** Triggers must be created after both tables and functions exist.

---

### Layer 11: Indexes
**Order:** 11
**Components:**
- All performance indexes on all tables
- All unique indexes for constraints

**Rationale:** Indexes should be created after tables are populated (if any initial data).

---

### Layer 12: Row Level Security Policies
**Order:** 12
**Components:**
- Enable RLS on all tables
- Create all RLS policies for all tables

**Rationale:** RLS policies should be the last step to ensure all dependencies exist.

---

## Existing Infrastructure

### DatabaseValidator Class
**Location:** `web/src/lib/database-validator.ts`
**Purpose:** Validates database structure against expected schema
**Key Methods:**
- `validateDatabase()` - Main validation entry point
- `validateTables()` - Validates all table structures
- `validateIndexes()` - Validates all indexes
- `validatePolicies()` - Validates all RLS policies
- `validateFunctions()` - Validates all database functions
- `getExpectedTables()` - Returns array of 17 core table definitions
- `getAllIndexes()` - Returns array of all expected indexes
- `getAllPolicies()` - Returns array of all expected RLS policies
- `getAllFunctions()` - Returns array of all expected functions

**Status:** ✅ Exists and functional (covers 17 core tables)
**Needs Update:** Add 10 additional tables to validation

---

### DatabaseSetup Class
**Location:** `web/src/lib/database-setup.ts`
**Purpose:** Orchestrates database setup execution
**Key Methods:**
- `runFullSetup()` - Executes complete database setup
- `executeStep()` - Executes individual setup steps
- `executeSqlScripts()` - Executes SQL scripts in order
- `createBackup()` - Creates database backup
- `rollback()` - Rolls back changes

**Status:** ✅ Exists and functional
**Needs Update:** Extend to support step-by-step execution with progress tracking

---

### SqlGenerator Class
**Location:** `web/src/lib/sql-generator.ts`
**Purpose:** Generates SQL scripts for database components
**Key Methods:**
- `generateAllScripts()` - Generates all SQL scripts in correct order
- `generateTableScript()` - Generates CREATE TABLE statements
- `generateIndexScript()` - Generates CREATE INDEX statements
- `generatePolicyScript()` - Generates RLS policy statements
- `generateFunctionScript()` - Generates function definitions
- `getTableCreationOrder()` - Returns dependency-ordered table list
- `getTableDependencies()` - Returns foreign key dependencies

**Status:** ✅ Exists and functional (covers 17 core tables)
**Needs Update:** Add 10 additional tables to generation logic

---

### API Endpoint
**Location:** `web/src/app/api/admin/database/setup/route.ts`
**Purpose:** API endpoint for database setup operations
**Actions Supported:**
- `validate` - Only validate database structure
- `setup` - Execute full setup
- `status` - Quick status check

**Status:** ✅ Exists and functional
**Needs Update:** Add progress tracking, step-by-step execution, rollback endpoints

---


