# Database Setup Wizard - Implementation Plan

## Overview

This document outlines the complete implementation plan for the automated database setup wizard in the PontoFlow admin panel.

**Target:** Admin Panel → Database Setup / System Configuration  
**Purpose:** Initialize entire system infrastructure with one-click setup  
**Safety:** Includes validation, backup, rollback, and dry-run capabilities

---

## Phase 1: Deep System Analysis ✅ COMPLETED

**Status:** ✅ COMPLETE  
**Deliverables:**
- [x] Catalog all 27 database tables
- [x] Identify all 12+ database functions
- [x] Identify all 5+ triggers
- [x] Document all RLS policies
- [x] Document all indexes (80+)
- [x] Identify PostgreSQL extensions (uuid-ossp, pgcrypto)
- [x] Document dependency order (12 layers)
- [x] Create comprehensive analysis documents

**Documents Created:**
- `docs/DATABASE_SETUP_WIZARD_ANALYSIS.md` - Core 17 tables
- `docs/DATABASE_SETUP_WIZARD_ANALYSIS_PART2.md` - Additional 10 tables + functions
- `docs/DATABASE_SETUP_WIZARD_SUMMARY.md` - Executive summary with dependency order

---

## Phase 2: SQL Migration Scripts 🔄 NEXT

**Status:** 🔄 IN PROGRESS  
**Objective:** Create comprehensive SQL migration scripts organized by dependency order

### 2.1 Create Master Migration File
**File:** `web/migrations/MASTER_SETUP_V2.sql`  
**Contents:**
- Header with version info and warnings
- Extension installation (uuid-ossp, pgcrypto)
- All 27 tables in dependency order (Layers 1-8)
- All indexes (Layer 11)
- All functions (Layer 9)
- All triggers (Layer 10)
- All RLS policies (Layer 12)
- Footer with validation queries

**Structure:**
```sql
-- ============================================
-- PontoFlow Database Setup - Master Script
-- Version: 2.0
-- Date: 2025-01-05
-- ============================================

-- LAYER 1: Extensions and Root Tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: tenants
CREATE TABLE IF NOT EXISTS public.tenants (...);

-- Table: _migrations
CREATE TABLE IF NOT EXISTS public._migrations (...);

-- LAYER 2: User and Environment Tables
-- ... and so on
```

---

### 2.2 Create Modular Migration Files
**Directory:** `web/migrations/setup-wizard/`  
**Files:**
- `01-extensions.sql` - PostgreSQL extensions
- `02-layer-01-root-tables.sql` - tenants, _migrations, system_config
- `03-layer-02-user-environment.sql` - profiles, users_unified, environments, vessels, password_reset_tokens
- `04-layer-03-roles-settings.sql` - tenant_user_roles, tenant_settings, user_invitations, notification_preferences, push_subscriptions
- `05-layer-04-groups-employees.sql` - groups, employees
- `06-layer-05-assignments.sql` - manager_group_assignments, employee_group_members, vessel_group_links
- `07-layer-06-timesheets-periods.sql` - timesheets, period_locks
- `08-layer-07-timesheet-details.sql` - timesheet_entries, approvals, timesheet_annotations
- `09-layer-08-communication-audit.sql` - comments, notifications, notification_log, audit_log
- `10-layer-09-functions.sql` - All database functions
- `11-layer-10-triggers.sql` - All triggers
- `12-layer-11-indexes.sql` - All indexes
- `13-layer-12-rls-policies.sql` - All RLS policies

**Rationale:** Modular files allow step-by-step execution and easier debugging.

---

### 2.3 Create Validation Scripts
**File:** `web/migrations/setup-wizard/99-validation.sql`  
**Contents:**
- Check all tables exist
- Check all columns exist with correct types
- Check all constraints exist
- Check all indexes exist
- Check all functions exist
- Check all triggers exist
- Check RLS is enabled on all tables
- Generate validation report

---

### 2.4 Create Rollback Scripts
**File:** `web/migrations/setup-wizard/ROLLBACK.sql`  
**Contents:**
- Drop all triggers (reverse order)
- Drop all functions (reverse order)
- Drop all tables (reverse dependency order)
- Drop extensions (if safe)

**Warning:** This is a destructive operation and should require explicit confirmation.

---

## Phase 3: Backend API Endpoints 📋 PENDING

**Status:** 📋 PENDING  
**Objective:** Create or enhance API endpoints for setup operations

### 3.1 Extend Existing Setup Endpoint
**File:** `web/src/app/api/admin/database/setup/route.ts`  
**New Actions:**
- `validate` - ✅ Already exists
- `setup` - ✅ Already exists (enhance for step-by-step)
- `status` - ✅ Already exists
- `setup-step` - 🆕 Execute single layer/step
- `rollback` - 🆕 Rollback to previous state
- `dry-run` - 🆕 Preview what would be created
- `progress` - 🆕 Get current setup progress

**Request Format:**
```typescript
POST /api/admin/database/setup
{
  "action": "setup-step",
  "options": {
    "layer": 1,
    "createBackup": true,
    "dryRun": false
  }
}
```

**Response Format:**
```typescript
{
  "success": true,
  "data": {
    "layer": 1,
    "status": "completed",
    "componentsCreated": ["tenants", "_migrations", "system_config"],
    "errors": [],
    "warnings": [],
    "executionTime": 1234,
    "backupId": "backup-2025-01-05-123456"
  }
}
```

---

### 3.2 Create Progress Tracking Endpoint
**File:** `web/src/app/api/admin/database/setup/progress/route.ts`  
**Purpose:** Track setup progress across layers  
**Method:** GET  
**Response:**
```typescript
{
  "success": true,
  "data": {
    "totalLayers": 12,
    "completedLayers": 3,
    "currentLayer": 4,
    "status": "in_progress",
    "startedAt": "2025-01-05T10:00:00Z",
    "estimatedCompletion": "2025-01-05T10:05:00Z",
    "layers": [
      { "layer": 1, "status": "completed", "components": 4 },
      { "layer": 2, "status": "completed", "components": 5 },
      { "layer": 3, "status": "completed", "components": 5 },
      { "layer": 4, "status": "in_progress", "components": 2 }
    ]
  }
}
```

---

### 3.3 Create Rollback Endpoint
**File:** `web/src/app/api/admin/database/setup/rollback/route.ts`  
**Purpose:** Rollback database to previous state  
**Method:** POST  
**Request:**
```typescript
{
  "backupId": "backup-2025-01-05-123456",
  "confirmToken": "ROLLBACK-CONFIRM-TOKEN"
}
```

---

## Phase 4: Frontend Wizard UI 📋 PENDING

**Status:** 📋 PENDING
**Objective:** Create step-by-step wizard UI in admin panel

### 4.1 Create Wizard Page
**File:** `web/src/app/[locale]/admin/database-setup/page.tsx`
**Purpose:** Main database setup wizard page
**Access:** Admin role only
**Route:** `/admin/database-setup`

**Page Structure:**
```tsx
export default async function DatabaseSetupPage() {
  // Server-side: Check admin role
  await requireRole(['ADMIN']);

  return (
    <div className="container mx-auto py-8">
      <h1>Database Setup Wizard</h1>
      <DatabaseSetupWizard />
    </div>
  );
}
```

---

### 4.2 Create Wizard Client Component
**File:** `web/src/components/admin/DatabaseSetupWizard.tsx`
**Purpose:** Multi-step wizard UI with progress tracking

**Wizard Steps:**
1. **Welcome & Status Check** - Show current database status
2. **Component Selection** - Choose what to install (or select "Full Setup")
3. **Configuration** - Set options (backup, dry-run, etc.)
4. **Confirmation** - Review what will be created
5. **Execution** - Real-time progress tracking
6. **Summary** - Success/failure report with details

**Component Structure:**
```tsx
'use client';

export function DatabaseSetupWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [selectedLayers, setSelectedLayers] = useState<number[]>([]);
  const [options, setOptions] = useState<SetupOptions>({
    createBackup: true,
    dryRun: false,
    enableRollback: true,
  });

  return (
    <div className="wizard-container">
      <WizardProgress currentStep={currentStep} totalSteps={6} />

      {currentStep === 1 && <StatusCheckStep onNext={() => setCurrentStep(2)} />}
      {currentStep === 2 && <ComponentSelectionStep onNext={() => setCurrentStep(3)} />}
      {currentStep === 3 && <ConfigurationStep onNext={() => setCurrentStep(4)} />}
      {currentStep === 4 && <ConfirmationStep onNext={() => setCurrentStep(5)} />}
      {currentStep === 5 && <ExecutionStep onComplete={() => setCurrentStep(6)} />}
      {currentStep === 6 && <SummaryStep />}
    </div>
  );
}
```

---

### 4.3 Create Wizard Step Components

#### Step 1: Status Check
**File:** `web/src/components/admin/wizard/StatusCheckStep.tsx`
**Purpose:** Check current database status and show what's missing

**UI Elements:**
- Loading spinner while checking status
- Table showing all 27 tables with status (✅ Exists / ❌ Missing)
- Table showing all functions with status
- Table showing all triggers with status
- Summary: "X of Y components exist"
- Button: "Continue to Setup" or "Skip Setup (Already Complete)"

---

#### Step 2: Component Selection
**File:** `web/src/components/admin/wizard/ComponentSelectionStep.tsx`
**Purpose:** Choose which components to install

**UI Elements:**
- Radio button: "Full Setup (Recommended)" - Installs everything
- Radio button: "Custom Setup" - Choose specific layers
- If Custom: Checkboxes for each layer (1-12) with descriptions
- Warning: "Some layers depend on others. Dependencies will be auto-selected."
- Button: "Next"

---

#### Step 3: Configuration
**File:** `web/src/components/admin/wizard/ConfigurationStep.tsx`
**Purpose:** Set setup options

**UI Elements:**
- Checkbox: "Create backup before setup" (default: checked)
- Checkbox: "Enable rollback capability" (default: checked)
- Checkbox: "Dry-run mode (preview only, don't execute)" (default: unchecked)
- Info box: "Backup will be stored in Supabase and can be used to rollback"
- Button: "Next"

---

