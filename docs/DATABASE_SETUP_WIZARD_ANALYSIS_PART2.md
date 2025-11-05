# Database Setup Wizard - Part 2: Additional Tables and Components

## 2. Additional System Tables (10 Tables)

### 2.1 Custom Authentication System

#### `users_unified` - Unified User Table
**Purpose:** Custom authentication system (alternative to Supabase Auth)  
**Columns:**
- `id` (UUID, PRIMARY KEY, DEFAULT gen_random_uuid())
- `email` (TEXT, NOT NULL, UNIQUE)
- `password_hash` (TEXT, NOT NULL)
- `first_name` (TEXT, NOT NULL)
- `last_name` (TEXT, NOT NULL)
- `name` (TEXT, GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED)
- `phone_number` (TEXT)
- `position` (TEXT)
- `department` (TEXT)
- `role` (TEXT, NOT NULL, DEFAULT 'USER', CHECK)
- `active` (BOOLEAN, NOT NULL, DEFAULT true)
- `email_verified` (BOOLEAN, NOT NULL, DEFAULT false)
- `failed_login_attempts` (INTEGER, NOT NULL, DEFAULT 0)
- `lock_until` (TIMESTAMPTZ)
- `password_last_changed` (TIMESTAMPTZ)
- `drive_photo_url` (TEXT)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Constraints:**
- UNIQUE constraint on `email`
- CHECK: role IN ('USER', 'MANAGER_TIMESHEET', 'MANAGER', 'ADMIN')

**Indexes:**
- `idx_users_unified_email` UNIQUE ON (email)
- `idx_users_unified_role` ON (role)
- `idx_users_unified_active` ON (active)

**RLS:** Enabled  
**Dependencies:** None

---

#### `user_invitations` - User Invitation System
**Purpose:** Invite users to join the system  
**Columns:**
- `id` (UUID, PRIMARY KEY)
- `email` (TEXT, NOT NULL)
- `first_name` (TEXT, NOT NULL)
- `last_name` (TEXT, NOT NULL)
- `phone_number` (TEXT)
- `position` (TEXT)
- `department` (TEXT)
- `role` (TEXT, NOT NULL, CHECK)
- `token` (TEXT, NOT NULL, UNIQUE)
- `invited_by` (UUID, NOT NULL, FK → users_unified.id)
- `invited_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `expires_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW() + INTERVAL '7 days')
- `status` (TEXT, NOT NULL, DEFAULT 'pending', CHECK)
- `accepted_at` (TIMESTAMPTZ)
- `tenant_ids` (UUID[], DEFAULT '{}')
- `group_ids` (UUID[], DEFAULT '{}')
- `managed_group_ids` (UUID[], DEFAULT '{}')
- `metadata` (JSONB, DEFAULT '{}')
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Constraints:**
- UNIQUE constraint on `token`
- CHECK: role IN ('USER', 'MANAGER_TIMESHEET', 'MANAGER', 'ADMIN')
- CHECK: status IN ('pending', 'accepted', 'expired', 'cancelled')
- FK: invited_by → users_unified(id) ON DELETE CASCADE

**Indexes:**
- `idx_user_invitations_email` ON (email)
- `idx_user_invitations_token` ON (token)
- `idx_user_invitations_status` ON (status)
- `idx_user_invitations_invited_by` ON (invited_by)

**RLS:** Enabled  
**Dependencies:** users_unified

**Triggers:**
- `update_user_invitations_updated_at` - Updates updated_at on modification

---

### 2.2 Notification System (Phase 17)

#### `push_subscriptions` - Web Push Subscriptions
**Purpose:** Store web push notification subscriptions  
**Columns:**
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, NOT NULL, FK → auth.users.id)
- `endpoint` (TEXT, NOT NULL, UNIQUE)
- `p256dh` (TEXT, NOT NULL)
- `auth` (TEXT, NOT NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Constraints:**
- UNIQUE constraint on `endpoint`
- FK: user_id → auth.users(id) ON DELETE CASCADE

**Indexes:**
- `idx_push_subscriptions_user` ON (user_id)
- `idx_push_subscriptions_endpoint` UNIQUE ON (endpoint)

**RLS:** Enabled  
**Dependencies:** auth.users

---

#### `notification_preferences` - User Notification Preferences
**Purpose:** User preferences for notification channels  
**Columns:**
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, NOT NULL, FK → auth.users.id, UNIQUE)
- `email_enabled` (BOOLEAN, DEFAULT true)
- `push_enabled` (BOOLEAN, DEFAULT true)
- `in_app_enabled` (BOOLEAN, DEFAULT true)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**Constraints:**
- UNIQUE constraint on `user_id`
- FK: user_id → auth.users(id) ON DELETE CASCADE

**Indexes:**
- `idx_notification_preferences_user` UNIQUE ON (user_id)

**RLS:** Enabled  
**Dependencies:** auth.users

---

#### `notification_log` - Notification Audit Trail
**Purpose:** Log all sent notifications for audit  
**Columns:**
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, NOT NULL, FK → auth.users.id)
- `type` (TEXT, NOT NULL)
- `title` (TEXT, NOT NULL)
- `body` (TEXT, NOT NULL)
- `data` (JSONB)
- `sent_at` (TIMESTAMPTZ, DEFAULT NOW())
- `read_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Constraints:**
- FK: user_id → auth.users(id) ON DELETE CASCADE

**Indexes:**
- `idx_notification_log_user` ON (user_id)
- `idx_notification_log_sent_at` ON (sent_at)
- `idx_notification_log_type` ON (type)

**RLS:** Enabled  
**Dependencies:** auth.users

---

### 2.3 Period Management (Phase 18)

#### `period_locks` - Monthly Period Locks
**Purpose:** Control monthly period open/close for timesheet editing  
**Columns:**
- `id` (UUID, PRIMARY KEY)
- `tenant_id` (UUID, NOT NULL, FK → tenants.id)
- `period_month` (DATE, NOT NULL)
- `locked` (BOOLEAN, NOT NULL, DEFAULT true)
- `reason` (TEXT)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Constraints:**
- UNIQUE(tenant_id, period_month)
- FK: tenant_id → tenants(id) ON DELETE CASCADE

**Indexes:**
- `idx_period_locks_tenant` ON (tenant_id)
- `idx_period_locks_period` ON (period_month)
- `idx_period_locks_tenant_period` UNIQUE ON (tenant_id, period_month)

**RLS:** Enabled  
**Dependencies:** tenants

**Triggers:**
- `trg_period_locks_bu` - Normalizes period_month to first day of month and updates updated_at

---

### 2.4 Audit and Settings

#### `audit_log` - Comprehensive Audit Logging
**Purpose:** Log all critical system operations
**Columns:**
- `id` (UUID, PRIMARY KEY)
- `tenant_id` (UUID, NOT NULL)
- `user_id` (UUID, NOT NULL)
- `action` (TEXT, NOT NULL)
- `resource_type` (TEXT, NOT NULL)
- `resource_id` (UUID)
- `old_values` (JSONB)
- `new_values` (JSONB)
- `ip_address` (TEXT)
- `user_agent` (TEXT)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Constraints:**
- CHECK: action IN ('create', 'update', 'delete', 'view', 'approve', 'reject', 'submit', 'manager_edit_closed_period', 'employee_acknowledge_adjustment', 'batch_create')

**Indexes:**
- `idx_audit_log_tenant` ON (tenant_id)
- `idx_audit_log_user` ON (user_id)
- `idx_audit_log_action` ON (action)
- `idx_audit_log_resource` ON (resource_type, resource_id)
- `idx_audit_log_created_at` ON (created_at)

**RLS:** Enabled
**Dependencies:** None

---

#### `tenant_settings` - Tenant Configuration
**Purpose:** Extended tenant settings and configuration
**Columns:**
- `id` (UUID, PRIMARY KEY)
- `tenant_id` (UUID, NOT NULL, UNIQUE, FK → tenants.id)
- `company_name` (TEXT)
- `company_legal_name` (TEXT)
- `timezone` (TEXT, DEFAULT 'America/Sao_Paulo')
- `deadline_day` (INTEGER, DEFAULT 16)
- `work_mode` (TEXT, DEFAULT 'padrao')
- `auto_fill_enabled` (BOOLEAN, DEFAULT false)
- `auto_fill_past_days` (BOOLEAN, DEFAULT false)
- `auto_fill_future_days` (BOOLEAN, DEFAULT true)
- `allow_medical_attachments` (BOOLEAN, DEFAULT false)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**Constraints:**
- UNIQUE constraint on `tenant_id`
- FK: tenant_id → tenants(id) ON DELETE CASCADE

**Indexes:**
- `idx_tenant_settings_tenant` UNIQUE ON (tenant_id)

**RLS:** Enabled
**Dependencies:** tenants

---

#### `vessel_group_links` - Vessel-Group Associations
**Purpose:** Link vessels to groups
**Columns:**
- `vessel_id` (UUID, NOT NULL, FK → vessels.id)
- `group_id` (UUID, NOT NULL, FK → groups.id)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Constraints:**
- PRIMARY KEY (vessel_id, group_id)
- FK: vessel_id → vessels(id) ON DELETE CASCADE
- FK: group_id → groups(id) ON DELETE CASCADE

**Indexes:**
- `idx_vessel_group_links_vessel` ON (vessel_id)
- `idx_vessel_group_links_group` ON (group_id)

**RLS:** Enabled
**Dependencies:** vessels, groups

---

### 2.5 Optional/Future Tables

#### `system_config` - System Configuration
**Purpose:** Global system configuration key-value store
**Columns:**
- `key` (TEXT, PRIMARY KEY)
- `value` (TEXT)
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**Constraints:**
- PRIMARY KEY on `key`

**Indexes:** None
**RLS:** Disabled
**Dependencies:** None

**Note:** Used for configurable sync settings (enable_users_unified_sync)

---

## 3. Database Functions

### 3.1 Tenant Functions

#### `get_tenant_timezone(tenant_uuid UUID)`
**Purpose:** Returns tenant timezone
**Returns:** TEXT
**Language:** SQL
**Security:** DEFINER
**Stability:** STABLE

```sql
CREATE OR REPLACE FUNCTION public.get_tenant_timezone(tenant_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE AS $$
  SELECT timezone FROM public.tenants WHERE id = tenant_uuid;
$$;
```

---

#### `get_tenant_work_mode(tenant_uuid UUID)`
**Purpose:** Returns tenant work mode
**Returns:** TEXT
**Language:** SQL
**Security:** DEFINER
**Stability:** STABLE

```sql
CREATE OR REPLACE FUNCTION public.get_tenant_work_mode(tenant_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE AS $$
  SELECT work_mode FROM public.tenants WHERE id = tenant_uuid;
$$;
```

---

#### `get_tenant_deadline_day(tenant_uuid UUID)`
**Purpose:** Returns tenant deadline day
**Returns:** INTEGER
**Language:** SQL
**Security:** DEFINER
**Stability:** STABLE

```sql
CREATE OR REPLACE FUNCTION public.get_tenant_deadline_day(tenant_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE AS $$
  SELECT deadline_day FROM public.tenants WHERE id = tenant_uuid;
$$;
```

---

### 3.2 Timesheet Functions

#### `timesheet_deadline(periodo_ini DATE, tenant_uuid UUID)`
**Purpose:** Calculates timesheet submission deadline
**Returns:** TIMESTAMPTZ
**Language:** SQL
**Security:** DEFINER
**Stability:** STABLE

```sql
CREATE OR REPLACE FUNCTION public.timesheet_deadline(periodo_ini date, tenant_uuid UUID DEFAULT NULL)
RETURNS timestamptz
LANGUAGE sql
STABLE AS $$
  SELECT (date_trunc('month', periodo_ini)::date + interval '1 month + 4 days')::timestamptz
  AT TIME ZONE COALESCE(
    CASE
      WHEN tenant_uuid IS NOT NULL THEN public.get_tenant_timezone(tenant_uuid)
      ELSE 'America/Sao_Paulo'
    END,
    'UTC'
  );
$$;
```

---

#### `timesheet_past_deadline(periodo_ini DATE, tenant_uuid UUID)`
**Purpose:** Checks if timesheet deadline has passed
**Returns:** BOOLEAN
**Language:** SQL
**Security:** DEFINER
**Stability:** STABLE

```sql
CREATE OR REPLACE FUNCTION public.timesheet_past_deadline(periodo_ini date, tenant_uuid UUID DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE AS $$
  SELECT now() > public.timesheet_deadline(periodo_ini, tenant_uuid);
$$;
```

---

### 3.3 Utility Functions

#### `canonical_month(d DATE)`
**Purpose:** Normalizes date to first day of month
**Returns:** DATE
**Language:** SQL
**Stability:** IMMUTABLE

```sql
CREATE OR REPLACE FUNCTION public.canonical_month(d date)
RETURNS date
LANGUAGE sql
IMMUTABLE AS $$
  SELECT date_trunc('month', d)::date;
$$;
```

---


