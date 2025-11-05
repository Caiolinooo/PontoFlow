# 🚀 Quick Start Guide - Database Setup Wizard

## ⚡ 3-Minute Setup

### Option 1: Execute All at Once (Recommended)

**Using Supabase SQL Editor:**

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the content of `EXECUTE-ALL.sql`
3. Click "Run"
4. Wait for completion (~2-3 minutes)
5. Check validation results

**Using psql:**

```bash
cd web/migrations/setup-wizard
psql -h your-db-host -U your-user -d your-database -f EXECUTE-ALL.sql
```

### Option 2: Execute Scripts Individually

If you prefer step-by-step execution:

```bash
# 1. Extensions
psql -f 01-extensions.sql

# 2. Tables (Layers 1-8)
psql -f 02-layer-01-root-tables.sql
psql -f 03-layer-02-user-environment.sql
psql -f 04-layer-03-roles-settings.sql
psql -f 05-layer-04-groups-employees.sql
psql -f 06-layer-05-assignments.sql
psql -f 07-layer-06-timesheets-periods.sql
psql -f 08-layer-07-timesheet-details.sql
psql -f 09-layer-08-communication-audit.sql

# 3. Functions & Triggers (Layers 9-10)
psql -f 10-layer-09-functions.sql
psql -f 11-layer-10-triggers.sql

# 4. Indexes & Policies (Layers 11-12)
psql -f 12-layer-11-indexes.sql
psql -f 13-layer-12-rls-policies.sql

# 5. Validation
psql -f 99-validation.sql
```

## ✅ Expected Results

After successful execution, you should see:

```
✅ Extensions: OK (2/2)
✅ Tables: OK (27/27)
✅ Functions: OK (12/12+)
✅ Triggers: OK (5/5+)
✅ Indexes: OK (80/80+)
✅ RLS Policies: OK (30/30+)
✅ RLS Enabled: OK (27/27 tables)
```

## 🔍 Troubleshooting

### Issue: "Extension already exists"
**Solution:** This is normal. Scripts are idempotent and will skip existing objects.

### Issue: "Table already exists"
**Solution:** Scripts use `IF NOT EXISTS` - existing tables won't be modified.

### Issue: "Foreign key constraint violation"
**Solution:** Ensure you're executing scripts in order (01 → 13).

### Issue: "Permission denied"
**Solution:** Ensure your database user has `CREATE` permissions.

## 🧪 Testing the Installation

### 1. Check Tables
```sql
SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';
-- Expected: 27+ tables
```

### 2. Check Functions
```sql
SELECT COUNT(*) FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';
-- Expected: 12+ functions
```

### 3. Check RLS
```sql
SELECT COUNT(*) FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
-- Expected: 27 tables
```

### 4. Create Test Tenant
```sql
INSERT INTO public.tenants (name, slug, timezone)
VALUES ('Test Company', 'test-company', 'America/Sao_Paulo')
RETURNING *;
```

## 🔄 Rollback (Development Only)

⚠️ **WARNING:** This will delete ALL data!

```bash
psql -f ROLLBACK.sql
```

## 📚 Next Steps

1. **Create Initial Data:**
   - Create your first tenant
   - Add environments
   - Create user profiles

2. **Configure Settings:**
   - Set up SMTP in `tenant_settings`
   - Configure notification preferences
   - Set up branding

3. **Assign Roles:**
   - Add entries to `tenant_user_roles`
   - Create manager assignments
   - Set up groups

4. **Test Application:**
   - Create test employees
   - Create test timesheets
   - Test approval workflow

## 🆘 Need Help?

- Check [README.md](./README.md) for detailed documentation
- Review [DATABASE_SETUP_WIZARD_SUMMARY.md](../../../docs/DATABASE_SETUP_WIZARD_SUMMARY.md)
- Check individual SQL files for inline comments

## 📊 What Gets Installed

| Component | Count | Description |
|-----------|-------|-------------|
| Tables | 27 | All database tables |
| Functions | 12+ | Business logic functions |
| Triggers | 5+ | Automation triggers |
| Indexes | 80+ | Performance indexes |
| RLS Policies | 30+ | Security policies |
| Extensions | 2 | PostgreSQL extensions |

## ⏱️ Estimated Time

- **Full Installation:** 2-3 minutes
- **Validation:** 10 seconds
- **Rollback:** 30 seconds

---

**Ready to start?** Run `EXECUTE-ALL.sql` and you're done! 🎉

