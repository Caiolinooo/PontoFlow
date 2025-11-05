# Database Setup Wizard - Complete System Infrastructure Analysis

## Executive Summary

This document catalogs ALL database components required for the PontoFlow timesheet management system to function properly. This analysis serves as the foundation for the automated database setup wizard.

**Analysis Date:** 2025-01-05  
**System:** PontoFlow Timesheet Manager (Multi-tenant)  
**Database:** PostgreSQL 15+ (Supabase)  
**Total Tables Identified:** 27 tables  
**Total Functions:** 12+ database functions  
**Total Triggers:** 5+ triggers  
**Storage Buckets:** 1 (public bucket)  
**Extensions Required:** uuid-ossp, pgcrypto

---

## 1. Core Database Tables (17 Tables)

### 1.1 Multi-Tenant Foundation

#### `tenants` - Organizations/Clients
**Purpose:** Root table for multi-tenant isolation  
**Columns:**
- `id` (UUID, PRIMARY KEY)
- `name` (TEXT, NOT NULL)
- `slug` (TEXT, UNIQUE, NOT NULL)
- `timezone` (TEXT, NOT NULL, DEFAULT 'America/Sao_Paulo')
- `work_mode` (VARCHAR(50), DEFAULT 'padrao')
- `deadline_day` (INTEGER, DEFAULT 16)
- `settings` (JSONB, DEFAULT '{}')
- `created_at` (TIMESTAMPTZ, NOT NULL)

**Constraints:**
- UNIQUE constraint on `slug`
- CHECK constraint: `timezone ~ '^[A-Za-z_]+/[A-Za-z_]+(-[A-Za-z_]+)*$'`

**Indexes:**
- `idx_tenants_slug` ON (slug)
- `idx_tenants_timezone` ON (timezone)
- `idx_tenants_work_mode` ON (work_mode)
- `idx_tenants_deadline_day` ON (deadline_day)
- `idx_tenants_smtp_enabled` ON ((settings->'smtp'->>'enabled')) WHERE enabled = true

**RLS:** Enabled  
**Dependencies:** None (root table)

---

#### `environments` - Work Environments
**Purpose:** Work locations per tenant (office, offshore, etc.)  
**Columns:**
- `id` (UUID, PRIMARY KEY)
- `tenant_id` (UUID, NOT NULL, FK → tenants.id)
- `name` (TEXT, NOT NULL)
- `slug` (TEXT, NOT NULL)
- `color` (TEXT, DEFAULT '#3B82F6')
- `auto_fill_enabled` (BOOLEAN, DEFAULT true)
- `created_at` (TIMESTAMPTZ, NOT NULL)

**Constraints:**
- UNIQUE(tenant_id, slug)
- FK: tenant_id → tenants(id) ON DELETE CASCADE

**Indexes:**
- `idx_environments_tenant` ON (tenant_id)

**RLS:** Enabled  
**Dependencies:** tenants

---

#### `profiles` - User Profiles
**Purpose:** User profile data (separate from auth.users)  
**Columns:**
- `user_id` (UUID, PRIMARY KEY)
- `display_name` (TEXT)
- `email` (TEXT)
- `phone` (TEXT)
- `ativo` (BOOLEAN, NOT NULL, DEFAULT true)
- `locale` (TEXT, NOT NULL, DEFAULT 'pt-BR', CHECK IN ('pt-BR', 'en-GB'))
- `ui_theme` (TEXT, CHECK IN ('light', 'dark'))
- `avatar_url` (TEXT)
- `created_at` (TIMESTAMPTZ, NOT NULL)

**Constraints:**
- CHECK: locale IN ('pt-BR', 'en-GB')
- CHECK: ui_theme IN ('light', 'dark')

**Indexes:**
- `idx_profiles_email` ON (email)

**RLS:** Enabled  
**Dependencies:** None (links to auth.users)

---

#### `tenant_user_roles` - User Roles per Tenant
**Purpose:** Role-based access control per tenant  
**Columns:**
- `tenant_id` (UUID, NOT NULL, FK → tenants.id)
- `user_id` (UUID, NOT NULL)
- `role` (TEXT, NOT NULL, CHECK)

**Constraints:**
- PRIMARY KEY (tenant_id, user_id, role)
- CHECK: role IN ('COLAB', 'GERENTE', 'TENANT_ADMIN', 'ADMIN_GLOBAL', 'USER', 'MANAGER', 'MANAGER_TIMESHEET', 'ADMIN')
- FK: tenant_id → tenants(id) ON DELETE CASCADE

**Indexes:**
- `idx_tenant_user_roles_user` ON (user_id)
- `idx_tenant_user_roles_tenant` ON (tenant_id)

**RLS:** Enabled  
**Dependencies:** tenants

---

### 1.2 Group Management

#### `groups` - Work Groups
**Purpose:** Employee grouping for delegation  
**Columns:**
- `id` (UUID, PRIMARY KEY)
- `tenant_id` (UUID, NOT NULL, FK → tenants.id)
- `environment_id` (UUID, FK → environments.id)
- `name` (TEXT, NOT NULL)

**Constraints:**
- FK: tenant_id → tenants(id) ON DELETE CASCADE
- FK: environment_id → environments(id) ON DELETE SET NULL

**Indexes:**
- `idx_groups_tenant` ON (tenant_id)
- `idx_groups_tenant_name` ON (tenant_id, name)
- `idx_groups_environment` ON (environment_id)

**RLS:** Enabled  
**Dependencies:** tenants, environments

---

#### `manager_group_assignments` - Manager Delegations
**Purpose:** Assigns managers to groups  
**Columns:**
- `manager_id` (UUID, NOT NULL)
- `group_id` (UUID, NOT NULL, FK → groups.id)
- `tenant_id` (UUID, NOT NULL, FK → tenants.id)

**Constraints:**
- PRIMARY KEY (manager_id, group_id)
- FK: group_id → groups(id) ON DELETE CASCADE
- FK: tenant_id → tenants(id) ON DELETE CASCADE

**Indexes:**
- `idx_manager_group_assignments_tenant_manager` ON (tenant_id, manager_id)

**RLS:** Enabled  
**Dependencies:** groups, tenants

---

#### `employee_group_members` - Group Members
**Purpose:** Assigns employees to groups  
**Columns:**
- `employee_id` (UUID, NOT NULL)
- `group_id` (UUID, NOT NULL, FK → groups.id)
- `tenant_id` (UUID, NOT NULL, FK → tenants.id)

**Constraints:**
- PRIMARY KEY (employee_id, group_id)
- FK: group_id → groups(id) ON DELETE CASCADE
- FK: tenant_id → tenants(id) ON DELETE CASCADE

**Indexes:**
- `idx_employee_group_members_tenant_employee` ON (tenant_id, employee_id)

**RLS:** Enabled  
**Dependencies:** groups, tenants

---

### 1.3 Vessels and Employees

#### `vessels` - Vessels/Ships
**Purpose:** Vessel registry per tenant  
**Columns:**
- `id` (UUID, PRIMARY KEY)
- `tenant_id` (UUID, NOT NULL, FK → tenants.id)
- `name` (TEXT, NOT NULL)
- `code` (TEXT)

**Constraints:**
- FK: tenant_id → tenants(id) ON DELETE CASCADE

**Indexes:**
- `idx_vessels_tenant` ON (tenant_id)
- `idx_vessels_tenant_name` ON (tenant_id, name)

**RLS:** Enabled
**Dependencies:** tenants

---

#### `employees` - Employee Records
**Purpose:** Employee data linked to profiles
**Columns:**
- `id` (UUID, PRIMARY KEY)
- `tenant_id` (UUID, NOT NULL, FK → tenants.id)
- `profile_id` (UUID, NOT NULL, FK → profiles.user_id)
- `vessel_id` (UUID, FK → vessels.id)
- `cargo` (TEXT)
- `centro_custo` (TEXT)
- `dados_pessoais_json` (JSONB, DEFAULT '{}')
- `documentos_json` (JSONB, DEFAULT '{}')
- `created_at` (TIMESTAMPTZ, NOT NULL)

**Constraints:**
- FK: tenant_id → tenants(id) ON DELETE CASCADE
- FK: profile_id → profiles(user_id) ON DELETE CASCADE
- FK: vessel_id → vessels(id) ON DELETE SET NULL
- UNIQUE INDEX: idx_employees_profile_tenant ON (profile_id, tenant_id)

**Indexes:**
- `idx_employees_tenant` ON (tenant_id)
- `idx_employees_profile` ON (profile_id)
- `idx_employees_vessel` ON (vessel_id)
- `idx_employees_profile_tenant` UNIQUE ON (profile_id, tenant_id)

**RLS:** Enabled
**Dependencies:** tenants, profiles, vessels

---

### 1.4 Timesheet System

#### `timesheets` - Timesheet Headers
**Purpose:** Timesheet period records
**Columns:**
- `id` (UUID, PRIMARY KEY)
- `tenant_id` (UUID, NOT NULL, FK → tenants.id)
- `employee_id` (UUID, NOT NULL, FK → employees.id)
- `periodo_ini` (DATE, NOT NULL)
- `periodo_fim` (DATE, NOT NULL)
- `status` (TEXT, NOT NULL, CHECK)
- `created_at` (TIMESTAMPTZ, NOT NULL)

**Constraints:**
- CHECK: status IN ('rascunho', 'enviado', 'aprovado', 'recusado', 'bloqueado')
- FK: tenant_id → tenants(id) ON DELETE CASCADE
- FK: employee_id → employees(id) ON DELETE CASCADE

**Indexes:**
- `idx_timesheets_employee` ON (employee_id)
- `idx_timesheets_tenant` ON (tenant_id)
- `idx_timesheets_period` ON (periodo_ini, periodo_fim)
- `idx_timesheets_status` ON (status)

**RLS:** Enabled
**Dependencies:** tenants, employees

---

#### `timesheet_entries` - Timesheet Entries
**Purpose:** Individual time entries
**Columns:**
- `id` (UUID, PRIMARY KEY)
- `tenant_id` (UUID, NOT NULL, FK → tenants.id)
- `timesheet_id` (UUID, NOT NULL, FK → timesheets.id)
- `environment_id` (UUID, FK → environments.id)
- `tipo` (TEXT, NOT NULL, CHECK)
- `data` (DATE, NOT NULL)
- `hora_ini` (TIME)
- `hora_fim` (TIME)
- `comentario` (TEXT)

**Constraints:**
- CHECK: tipo IN ('EMBARQUE', 'DESEMBARQUE', 'TRANSLADO')
- FK: tenant_id → tenants(id) ON DELETE CASCADE
- FK: timesheet_id → timesheets(id) ON DELETE CASCADE
- FK: environment_id → environments(id) ON DELETE SET NULL

**Indexes:**
- `idx_entries_timesheet` ON (timesheet_id)
- `idx_entries_environment` ON (environment_id)
- `idx_entries_data` ON (data)

**RLS:** Enabled
**Dependencies:** tenants, timesheets, environments

---

#### `approvals` - Approval Audit Trail
**Purpose:** Timesheet approval/rejection records
**Columns:**
- `id` (UUID, PRIMARY KEY)
- `tenant_id` (UUID, NOT NULL, FK → tenants.id)
- `timesheet_id` (UUID, NOT NULL, FK → timesheets.id)
- `manager_id` (UUID, NOT NULL)
- `status` (TEXT, NOT NULL, CHECK)
- `mensagem` (TEXT)
- `created_at` (TIMESTAMPTZ, NOT NULL)

**Constraints:**
- CHECK: status IN ('aprovado', 'recusado')
- FK: tenant_id → tenants(id) ON DELETE CASCADE
- FK: timesheet_id → timesheets(id) ON DELETE CASCADE

**Indexes:**
- `idx_approvals_timesheet` ON (timesheet_id)
- `idx_approvals_manager` ON (manager_id)

**RLS:** Enabled
**Dependencies:** tenants, timesheets

---

#### `timesheet_annotations` - Manager Feedback
**Purpose:** Manager annotations on timesheet entries
**Columns:**
- `id` (UUID, PRIMARY KEY)
- `tenant_id` (UUID, NOT NULL, FK → tenants.id)
- `timesheet_id` (UUID, NOT NULL, FK → timesheets.id)
- `entry_id` (UUID, FK → timesheet_entries.id)
- `field_path` (TEXT)
- `message` (TEXT, NOT NULL)
- `created_by` (UUID, NOT NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL)

**Constraints:**
- FK: tenant_id → tenants(id) ON DELETE CASCADE
- FK: timesheet_id → timesheets(id) ON DELETE CASCADE
- FK: entry_id → timesheet_entries(id) ON DELETE CASCADE

**Indexes:**
- `idx_annotations_timesheet` ON (timesheet_id)
- `idx_annotations_entry` ON (entry_id)

**RLS:** Enabled
**Dependencies:** tenants, timesheets, timesheet_entries

---

### 1.5 Communication and Notifications

#### `comments` - Comments System
**Purpose:** Comments on various entities
**Columns:**
- `id` (UUID, PRIMARY KEY)
- `tenant_id` (UUID, NOT NULL, FK → tenants.id)
- `entity_type` (TEXT, NOT NULL)
- `entity_id` (UUID, NOT NULL)
- `author_id` (UUID, NOT NULL)
- `texto` (TEXT, NOT NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL)

**Constraints:**
- FK: tenant_id → tenants(id) ON DELETE CASCADE

**Indexes:**
- `idx_comments_entity` ON (entity_type, entity_id)
- `idx_comments_author` ON (author_id)

**RLS:** Enabled
**Dependencies:** tenants

---

