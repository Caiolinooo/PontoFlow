# Database Setup Wizard - SQL Migration Scripts

## 📋 Overview

This directory contains **15 SQL migration scripts** organized in **12 dependency layers** for setting up the complete PontoFlow database infrastructure.

## 🗂️ File Structure

```
setup-wizard/
├── 01-extensions.sql                    # PostgreSQL extensions
├── 02-layer-01-root-tables.sql          # Root tables (tenants, _migrations, system_config)
├── 03-layer-02-user-environment.sql     # User & environment tables
├── 04-layer-03-roles-settings.sql       # Roles & settings tables
├── 05-layer-04-groups-employees.sql     # Groups & employees tables
├── 06-layer-05-assignments.sql          # Assignment tables
├── 07-layer-06-timesheets-periods.sql   # Timesheet & period tables
├── 08-layer-07-timesheet-details.sql    # Timesheet detail tables
├── 09-layer-08-communication-audit.sql  # Communication & audit tables
├── 10-layer-09-functions.sql            # Database functions (12+)
├── 11-layer-10-triggers.sql             # Database triggers (5+)
├── 12-layer-11-indexes.sql              # Performance indexes (80+)
├── 13-layer-12-rls-policies.sql         # RLS policies (30+)
├── 99-validation.sql                    # Validation script
├── ROLLBACK.sql                         # Complete rollback script
└── README.md                            # This file
```

## 🎯 Execution Order

**IMPORTANT:** Scripts must be executed in numerical order to respect dependencies.

### Option A: Execute All Scripts (Recommended)

```bash
# From Supabase SQL Editor or psql
\i 01-extensions.sql
\i 02-layer-01-root-tables.sql
\i 03-layer-02-user-environment.sql
\i 04-layer-03-roles-settings.sql
\i 05-layer-04-groups-employees.sql
\i 06-layer-05-assignments.sql
\i 07-layer-06-timesheets-periods.sql
\i 08-layer-07-timesheet-details.sql
\i 09-layer-08-communication-audit.sql
\i 10-layer-09-functions.sql
\i 11-layer-10-triggers.sql
\i 12-layer-11-indexes.sql
\i 13-layer-12-rls-policies.sql
\i 99-validation.sql
```

### Option B: Execute Individual Layers

You can execute scripts individually if you need to:
- Install only specific components
- Debug installation issues
- Update specific layers

```sql
-- Example: Install only tables (Layers 1-8)
\i 01-extensions.sql
\i 02-layer-01-root-tables.sql
-- ... continue with other table layers
```

## 📊 Database Components

### Tables: 27
- **Layer 1:** tenants, _migrations, system_config
- **Layer 2:** profiles, users_unified, environments, vessels, password_reset_tokens
- **Layer 3:** tenant_user_roles, tenant_settings, user_invitations, notification_preferences, push_subscriptions
- **Layer 4:** groups, employees
- **Layer 5:** manager_group_assignments, employee_group_members, vessel_group_links
- **Layer 6:** timesheets, period_locks
- **Layer 7:** timesheet_entries, approvals, timesheet_annotations
- **Layer 8:** comments, notifications, notification_log, audit_log

### Functions: 12+
- Timezone management (get_tenant_timezone, convert_to_tenant_timezone)
- Timesheet calculations (timesheet_deadline, calculate_timesheet_hours)
- User management (get_user_tenants, set_tenant_context)
- Cleanup utilities (cleanup_expired_reset_tokens, expire_old_invitations)

### Triggers: 5+
- Auto-create profiles for new users
- Sync profiles to users_unified
- Auto-update updated_at columns
- Normalize period_locks dates

### Indexes: 80+
- Performance indexes for all major query patterns
- Tenant isolation indexes
- Foreign key indexes
- Composite indexes for complex queries

### RLS Policies: 30+
- Multi-tenant data isolation
- Role-based access control
- Manager delegation policies
- Employee self-access policies

## ✅ Validation

After running all scripts, execute the validation script:

```sql
\i 99-validation.sql
```

Expected output:
```
✅ Extensions: OK (2/2)
✅ Tables: OK (27/27)
✅ Functions: OK (12/12+)
✅ Triggers: OK (5/5+)
✅ Indexes: OK (80/80+)
✅ RLS Policies: OK (30/30+)
✅ RLS Enabled: OK (27/27 tables)
```

## 🔄 Rollback

⚠️ **WARNING:** The rollback script will **DELETE ALL DATA** and drop all database objects.

Only use in development/testing environments:

```sql
\i ROLLBACK.sql
```

## 🛡️ Safety Features

1. **Idempotent Scripts:** All scripts use `IF NOT EXISTS` / `IF EXISTS` clauses
2. **Dependency Order:** Scripts are numbered to enforce correct execution order
3. **Validation:** Built-in verification after each layer
4. **Rollback:** Complete rollback script for development environments
5. **Comments:** Extensive documentation in each script

## 📝 Notes

- All tables have **Row Level Security (RLS)** enabled
- All tables include **created_at** and **updated_at** timestamps
- Foreign keys use appropriate **ON DELETE** actions
- Indexes are optimized for multi-tenant queries
- Functions use **SECURITY DEFINER** for controlled access

## 🔗 Related Documentation

- [DATABASE_SETUP_WIZARD_ANALYSIS.md](../../../docs/DATABASE_SETUP_WIZARD_ANALYSIS.md)
- [DATABASE_SETUP_WIZARD_SUMMARY.md](../../../docs/DATABASE_SETUP_WIZARD_SUMMARY.md)
- [DATABASE_SETUP_WIZARD_IMPLEMENTATION_PLAN.md](../../../docs/DATABASE_SETUP_WIZARD_IMPLEMENTATION_PLAN.md)

## 🚀 Next Steps

After successful installation:
1. ✅ Verify all components with `99-validation.sql`
2. 🔧 Configure tenant settings in `tenant_settings` table
3. 👥 Create initial users and assign roles
4. 🏢 Create tenants and environments
5. 📊 Test the application

---

**Created:** 2025-11-05  
**Version:** 1.0  
**Status:** Production Ready

