-- ==========================================
-- Database Setup Wizard - MASTER EXECUTION SCRIPT
-- ==========================================
-- Purpose: Execute all migration scripts in correct order
-- Usage: Run this file in Supabase SQL Editor or psql
-- ==========================================

-- Display banner
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  DATABASE SETUP WIZARD';
  RAISE NOTICE '  PontoFlow - Timesheet Manager';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting complete database installation...';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- Layer 1: Extensions
-- ==========================================
\echo '📦 Layer 1: Installing PostgreSQL extensions...'
\i 01-extensions.sql

-- ==========================================
-- Layer 2: Root Tables
-- ==========================================
\echo '🏗️  Layer 2: Creating root tables...'
\i 02-layer-01-root-tables.sql

-- ==========================================
-- Layer 3: User & Environment Tables
-- ==========================================
\echo '👥 Layer 3: Creating user & environment tables...'
\i 03-layer-02-user-environment.sql

-- ==========================================
-- Layer 4: Roles & Settings Tables
-- ==========================================
\echo '🔐 Layer 4: Creating roles & settings tables...'
\i 04-layer-03-roles-settings.sql

-- ==========================================
-- Layer 5: Groups & Employees Tables
-- ==========================================
\echo '👔 Layer 5: Creating groups & employees tables...'
\i 05-layer-04-groups-employees.sql

-- ==========================================
-- Layer 6: Assignment Tables
-- ==========================================
\echo '🔗 Layer 6: Creating assignment tables...'
\i 06-layer-05-assignments.sql

-- ==========================================
-- Layer 7: Timesheets & Period Tables
-- ==========================================
\echo '📅 Layer 7: Creating timesheet & period tables...'
\i 07-layer-06-timesheets-periods.sql

-- ==========================================
-- Layer 8: Timesheet Detail Tables
-- ==========================================
\echo '📝 Layer 8: Creating timesheet detail tables...'
\i 08-layer-07-timesheet-details.sql

-- ==========================================
-- Layer 9: Communication & Audit Tables
-- ==========================================
\echo '💬 Layer 9: Creating communication & audit tables...'
\i 09-layer-08-communication-audit.sql

-- ==========================================
-- Layer 10: Database Functions
-- ==========================================
\echo '⚙️  Layer 10: Creating database functions...'
\i 10-layer-09-functions.sql

-- ==========================================
-- Layer 11: Database Triggers
-- ==========================================
\echo '🔔 Layer 11: Creating database triggers...'
\i 11-layer-10-triggers.sql

-- ==========================================
-- Layer 12: Performance Indexes
-- ==========================================
\echo '🚀 Layer 12: Creating performance indexes...'
\i 12-layer-11-indexes.sql

-- ==========================================
-- Layer 13: RLS Policies
-- ==========================================
\echo '🛡️  Layer 13: Creating RLS policies...'
\i 13-layer-12-rls-policies.sql

-- ==========================================
-- Validation
-- ==========================================
\echo '✅ Running validation checks...'
\i 99-validation.sql

-- ==========================================
-- Final Summary
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  DATABASE SETUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All migration scripts executed successfully.';
  RAISE NOTICE 'Review the validation results above.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create your first tenant';
  RAISE NOTICE '2. Assign user roles';
  RAISE NOTICE '3. Configure tenant settings';
  RAISE NOTICE '4. Start using the application';
  RAISE NOTICE '';
END $$;

