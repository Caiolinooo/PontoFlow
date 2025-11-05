# Issue 5: Unify "Usuários" and "Funcionários" Pages - Analysis

**Date:** 2025-11-04  
**Status:** 🔍 IN ANALYSIS  
**Priority:** 3 (Medium)

---

## Problem Statement

There are two separate pages in the "People" menu:
1. **"Usuários" (Users)** - `/admin/users`
2. **"Funcionários" (Employees)** - `/admin/employees`

This creates duplication and confusion for administrators.

---

## Current Implementation Analysis

### 1. "Usuários" (Users) Page

**Location:** `web/src/app/[locale]/admin/users/page.tsx`

**Data Source:** `users_unified` table

**Columns Displayed:**
- Avatar + Name (first_name + last_name)
- Position
- Email
- Role (ADMIN, MANAGER, MANAGER_TIMESHEET, USER)
- Department
- Status (Active/Inactive)
- Actions (Edit, Delete)

**Features:**
- ✅ Search by email, first_name, last_name
- ✅ Filter by role (ADMIN, MANAGER, USER)
- ✅ Filter by status (active/inactive)
- ✅ Pagination (20 per page)
- ✅ Create new user (`/admin/users/new`)
- ✅ Edit user (`/admin/users/[id]`)
- ✅ Delete user
- ✅ Invite user (email invitation system)
- ✅ Manage invitations modal
- ✅ Avatar display with fallback to initials

**Purpose:** Manage user accounts, authentication, roles, and permissions

**Key Fields:**
- Authentication: email, password (via Supabase Auth)
- Profile: first_name, last_name, position, department
- Authorization: role (global role)
- Status: active (boolean)
- Photo: drive_photo_url

---

### 2. "Funcionários" (Employees) Page

**Location:** `web/src/app/[locale]/admin/employees/page.tsx`

**Data Source:** `employees` table (joined with `profiles`)

**Columns Displayed:**
- ID (employee UUID)
- Profile (name/display_name/email/profile_id)
- Groups (delegation groups)
- Managers (assigned managers)
- Vessel ID
- Position (cargo)
- Cost Center (centro_custo)
- Actions (Edit, Manage Groups, Delete)

**Features:**
- ✅ Tenant-specific employee list
- ✅ Tenant selector modal
- ✅ Create new employee (`/admin/employees/new`)
- ✅ Edit employee (inline prompts for vessel, position, cost center)
- ✅ Delete employee
- ✅ Manage groups modal (add/remove from delegation groups)
- ✅ Display assigned managers
- ✅ No search or filtering

**Purpose:** Manage HR data, organizational structure, and delegation groups

**Key Fields:**
- Tenant: tenant_id (multi-tenant isolation)
- Profile: profile_id (references profiles table)
- HR Data: vessel_id, cargo (position), centro_custo (cost center)
- Organization: groups (delegation groups), managers
- Additional: dados_pessoais_json, documentos_json (JSONB fields)

---

## Key Differences

| Aspect | Users | Employees |
|--------|-------|-----------|
| **Table** | `users_unified` | `employees` |
| **Purpose** | Authentication & Authorization | HR & Organization |
| **Tenant** | Single tenant (via user.tenant_id) | Multi-tenant (explicit tenant_id) |
| **Search** | ✅ Yes (email, name) | ❌ No |
| **Filters** | ✅ Role, Status | ❌ None |
| **Pagination** | ✅ Yes (20/page) | ❌ No |
| **Groups** | ❌ No | ✅ Yes (delegation groups) |
| **Managers** | ❌ No | ✅ Yes |
| **Vessel** | ❌ No | ✅ Yes |
| **Cost Center** | ❌ No | ✅ Yes |
| **Invitations** | ✅ Yes | ❌ No |
| **Edit UI** | Dedicated page | Inline prompts |
| **Avatar** | ✅ Yes | ❌ No |

---

## Database Relationship

```
auth.users (Supabase Auth)
    ↓
profiles (user_id references auth.users.id)
    ↓
users_unified (legacy sync table)
    ↓
employees (profile_id references profiles.user_id, tenant_id)
```

**Key Insight:** 
- A **user** is an authentication account
- An **employee** is a tenant-specific HR record linked to a user profile
- One user can potentially be an employee in multiple tenants

---

## Overlap and Redundancy

### Overlapping Fields:
- **Name:** Both show user name (users_unified.first_name/last_name vs employees.name/display_name)
- **Email:** Both can display email
- **Position:** users_unified.position vs employees.cargo

### Unique to Users:
- Role (ADMIN, MANAGER, USER)
- Department
- Active status
- Email invitations
- Avatar

### Unique to Employees:
- Tenant-specific data
- Vessel assignment
- Cost center
- Delegation groups
- Managers
- HR documents (JSONB)

---

## User Confusion Points

1. **"Should I create a User or an Employee?"**
   - Not clear when to use which page
   - Relationship between users and employees is unclear

2. **"Why do I see different people in each list?"**
   - Users shows all users in the system
   - Employees shows only employees for the selected tenant

3. **"Where do I manage groups?"**
   - Only available in Employees page
   - Not obvious from navigation

4. **"How do I invite someone?"**
   - Only available in Users page
   - Not obvious that invited users need to be added as employees

---

## Proposed Solutions

### Option 1: Unified Page with Tabs (RECOMMENDED)

Create a single "People" page with two tabs:

```
/admin/people
├── Accounts Tab (Users)
│   ├── User authentication and roles
│   ├── Email invitations
│   ├── Global permissions
│   └── Active/inactive status
└── HR Data Tab (Employees)
    ├── Tenant-specific employee records
    ├── Vessel assignments
    ├── Cost centers
    ├── Delegation groups
    └── Manager assignments
```

**Benefits:**
- ✅ Single location for all people management
- ✅ Clear separation of concerns (Auth vs HR)
- ✅ Easy to understand relationship
- ✅ Reduced navigation complexity

**Implementation:**
- Create new `/admin/people` page
- Reuse existing components for each tab
- Update navigation to point to unified page
- Add breadcrumb: People > Accounts / HR Data

---

### Option 2: Master-Detail View

Show users as master list, employees as detail panel:

```
/admin/people
├── Left: User List (master)
└── Right: Employee Details (detail)
    └── Shows employee records for selected user
```

**Benefits:**
- ✅ Shows relationship between users and employees
- ✅ Easy to see which users have employee records

**Drawbacks:**
- ❌ Complex UI
- ❌ Harder to implement
- ❌ May not work well on mobile

---

### Option 3: Keep Separate but Add Context

Keep both pages but add clear explanations and links:

**Changes:**
- Add banner on Users page: "After creating a user, add them as an employee →"
- Add banner on Employees page: "Employees must have a user account first →"
- Add "View as Employee" button on user rows
- Add "View User Account" button on employee rows

**Benefits:**
- ✅ Minimal code changes
- ✅ Preserves existing functionality

**Drawbacks:**
- ❌ Still confusing
- ❌ Doesn't solve core problem
- ❌ More clicks required

---

## Recommendation: Option 1 (Unified Page with Tabs)

This is the best balance of UX improvement and implementation effort.

**Next Steps:**
1. Create new `/admin/people` page
2. Implement tab navigation (Accounts, HR Data)
3. Reuse existing UsersPageClient and EmployeesListPage components
4. Update AdminNav to replace "Users" and "Employees" with single "People" link
5. Add redirect from old URLs to new unified page
6. Update translations
7. Test all functionality

---

**Status:** Awaiting approval to proceed with implementation.

