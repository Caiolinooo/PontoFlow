-- ==========================================
-- Database Setup Wizard - Layer 12: RLS Policies
-- ==========================================
-- Purpose: Create all Row Level Security policies
-- Dependencies: All tables (Layers 1-8)
-- Order: 13
-- Policies: 150+ RLS policies for data isolation
-- ==========================================

-- ==========================================
-- RLS Policies for: tenants
-- ==========================================
DROP POLICY IF EXISTS tenants_admin_access ON public.tenants;
CREATE POLICY tenants_admin_access ON public.tenants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = tenants.id 
        AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
        AND tur.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS tenants_user_select ON public.tenants;
CREATE POLICY tenants_user_select ON public.tenants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = tenants.id 
        AND tur.user_id = auth.uid()
    )
  );

-- ==========================================
-- RLS Policies for: environments
-- ==========================================
DROP POLICY IF EXISTS environments_tenant_access ON public.environments;
CREATE POLICY environments_tenant_access ON public.environments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = environments.tenant_id 
        AND tur.user_id = auth.uid()
    )
  );

-- ==========================================
-- RLS Policies for: profiles
-- ==========================================
DROP POLICY IF EXISTS profiles_own_access ON public.profiles;
CREATE POLICY profiles_own_access ON public.profiles
  FOR ALL USING (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS profiles_tenant_access ON public.profiles;
CREATE POLICY profiles_tenant_access ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.tenant_user_roles tur ON tur.tenant_id = e.tenant_id
      WHERE e.profile_id = profiles.user_id
        AND tur.user_id = auth.uid()
    )
  );

-- ==========================================
-- RLS Policies for: users_unified
-- ==========================================
DROP POLICY IF EXISTS users_unified_admin_all ON public.users_unified;
CREATE POLICY users_unified_admin_all ON public.users_unified
  FOR ALL USING (
    role = 'ADMIN' OR
    id = auth.uid()
  );

-- ==========================================
-- RLS Policies for: tenant_user_roles
-- ==========================================
DROP POLICY IF EXISTS tenant_user_roles_admin_access ON public.tenant_user_roles;
CREATE POLICY tenant_user_roles_admin_access ON public.tenant_user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = tenant_user_roles.tenant_id 
        AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
        AND tur.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS tenant_user_roles_own_select ON public.tenant_user_roles;
CREATE POLICY tenant_user_roles_own_select ON public.tenant_user_roles
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- ==========================================
-- RLS Policies for: groups
-- ==========================================
DROP POLICY IF EXISTS groups_tenant_access ON public.groups;
CREATE POLICY groups_tenant_access ON public.groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = groups.tenant_id 
        AND tur.user_id = auth.uid()
    )
  );

-- ==========================================
-- RLS Policies for: manager_group_assignments
-- ==========================================
DROP POLICY IF EXISTS manager_assignments_access ON public.manager_group_assignments;
CREATE POLICY manager_assignments_access ON public.manager_group_assignments
  FOR ALL USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.tenant_user_roles tur ON tur.tenant_id = g.tenant_id
      WHERE g.id = manager_group_assignments.group_id
        AND tur.user_id = auth.uid()
        AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
    )
  );

-- ==========================================
-- RLS Policies for: employee_group_members
-- ==========================================
DROP POLICY IF EXISTS employee_group_members_access ON public.employee_group_members;
CREATE POLICY employee_group_members_access ON public.employee_group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_group_members.employee_id
        AND (
          e.profile_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.tenant_user_roles tur
            WHERE tur.tenant_id = e.tenant_id
              AND tur.user_id = auth.uid()
          )
        )
    )
  );

-- ==========================================
-- RLS Policies for: vessels
-- ==========================================
DROP POLICY IF EXISTS vessels_tenant_access ON public.vessels;
CREATE POLICY vessels_tenant_access ON public.vessels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = vessels.tenant_id
        AND tur.user_id = auth.uid()
    )
  );

-- ==========================================
-- RLS Policies for: vessel_group_links
-- ==========================================
DROP POLICY IF EXISTS vessel_group_links_tenant_access ON public.vessel_group_links;
CREATE POLICY vessel_group_links_tenant_access ON public.vessel_group_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = vessel_group_links.tenant_id
        AND tur.user_id = auth.uid()
    )
  );

-- ==========================================
-- RLS Policies for: employees
-- ==========================================
DROP POLICY IF EXISTS employees_tenant_access ON public.employees;
CREATE POLICY employees_tenant_access ON public.employees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = employees.tenant_id
        AND tur.user_id = auth.uid()
    ) OR
    profile_id = auth.uid()
  );

-- ==========================================
-- RLS Policies for: timesheets
-- ==========================================
DROP POLICY IF EXISTS timesheets_employee_select ON public.timesheets;
CREATE POLICY timesheets_employee_select ON public.timesheets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = timesheets.employee_id
        AND e.tenant_id = timesheets.tenant_id
        AND e.profile_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.manager_group_assignments mga
      JOIN public.employee_group_members egm ON egm.group_id = mga.group_id
      WHERE egm.employee_id = timesheets.employee_id
        AND mga.manager_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = timesheets.tenant_id
        AND tur.user_id = auth.uid()
        AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
    )
  );

DROP POLICY IF EXISTS timesheets_employee_insert ON public.timesheets;
CREATE POLICY timesheets_employee_insert ON public.timesheets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = timesheets.employee_id
        AND e.tenant_id = timesheets.tenant_id
        AND e.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS timesheets_employee_update ON public.timesheets;
CREATE POLICY timesheets_employee_update ON public.timesheets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = timesheets.employee_id
        AND e.tenant_id = timesheets.tenant_id
        AND e.profile_id = auth.uid()
    ) AND status IN ('rascunho', 'recusado')
  );

DROP POLICY IF EXISTS timesheets_manager_update ON public.timesheets;
CREATE POLICY timesheets_manager_update ON public.timesheets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.manager_group_assignments mga
      JOIN public.employee_group_members egm ON egm.group_id = mga.group_id
      WHERE egm.employee_id = timesheets.employee_id
        AND mga.manager_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = timesheets.tenant_id
        AND tur.user_id = auth.uid()
        AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
    )
  );

-- ==========================================
-- RLS Policies for: timesheet_entries
-- ==========================================
DROP POLICY IF EXISTS timesheet_entries_access ON public.timesheet_entries;
CREATE POLICY timesheet_entries_access ON public.timesheet_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.timesheets ts
      JOIN public.employees e ON e.id = ts.employee_id
      WHERE ts.id = timesheet_entries.timesheet_id
        AND (
          e.profile_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.manager_group_assignments mga
            JOIN public.employee_group_members egm ON egm.group_id = mga.group_id
            WHERE egm.employee_id = ts.employee_id
              AND mga.manager_id = auth.uid()
          ) OR
          EXISTS (
            SELECT 1 FROM public.tenant_user_roles tur
            WHERE tur.tenant_id = ts.tenant_id
              AND tur.user_id = auth.uid()
              AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
          )
        )
    )
  );

-- ==========================================
-- RLS Policies for: approvals
-- ==========================================
DROP POLICY IF EXISTS approvals_access ON public.approvals;
CREATE POLICY approvals_access ON public.approvals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.timesheets ts
      WHERE ts.id = approvals.timesheet_id
        AND (
          EXISTS (
            SELECT 1 FROM public.manager_group_assignments mga
            JOIN public.employee_group_members egm ON egm.group_id = mga.group_id
            WHERE egm.employee_id = ts.employee_id
              AND mga.manager_id = auth.uid()
          ) OR
          EXISTS (
            SELECT 1 FROM public.tenant_user_roles tur
            WHERE tur.tenant_id = ts.tenant_id
              AND tur.user_id = auth.uid()
              AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
          )
        )
    )
  );

-- ==========================================
-- RLS Policies for: comments
-- ==========================================
DROP POLICY IF EXISTS comments_access ON public.comments;
CREATE POLICY comments_access ON public.comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.timesheets ts
      JOIN public.employees e ON e.id = ts.employee_id
      WHERE ts.id = comments.timesheet_id
        AND (
          e.profile_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.manager_group_assignments mga
            JOIN public.employee_group_members egm ON egm.group_id = mga.group_id
            WHERE egm.employee_id = ts.employee_id
              AND mga.manager_id = auth.uid()
          ) OR
          EXISTS (
            SELECT 1 FROM public.tenant_user_roles tur
            WHERE tur.tenant_id = ts.tenant_id
              AND tur.user_id = auth.uid()
              AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
          )
        )
    )
  );

-- ==========================================
-- RLS Policies for: notifications
-- ==========================================
DROP POLICY IF EXISTS notifications_own_access ON public.notifications;
CREATE POLICY notifications_own_access ON public.notifications
  FOR ALL USING (
    user_id = auth.uid()
  );

-- ==========================================
-- RLS Policies for: timesheet_annotations
-- ==========================================
DROP POLICY IF EXISTS timesheet_annotations_access ON public.timesheet_annotations;
CREATE POLICY timesheet_annotations_access ON public.timesheet_annotations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.timesheets ts
      JOIN public.employees e ON e.id = ts.employee_id
      WHERE ts.id = timesheet_annotations.timesheet_id
        AND (
          e.profile_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.manager_group_assignments mga
            JOIN public.employee_group_members egm ON egm.group_id = mga.group_id
            WHERE egm.employee_id = ts.employee_id
              AND mga.manager_id = auth.uid()
          ) OR
          EXISTS (
            SELECT 1 FROM public.tenant_user_roles tur
            WHERE tur.tenant_id = ts.tenant_id
              AND tur.user_id = auth.uid()
              AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
          )
        )
    )
  );

-- ==========================================
-- RLS Policies for: password_reset_tokens
-- ==========================================
DROP POLICY IF EXISTS password_reset_tokens_own_access ON public.password_reset_tokens;
CREATE POLICY password_reset_tokens_own_access ON public.password_reset_tokens
  FOR ALL USING (
    user_id = auth.uid()
  );

-- ==========================================
-- RLS Policies for: user_invitations
-- ==========================================
DROP POLICY IF EXISTS user_invitations_admin_all ON public.user_invitations;
CREATE POLICY user_invitations_admin_all ON public.user_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users_unified
      WHERE users_unified.id = auth.uid()
        AND users_unified.role = 'ADMIN'
    ) OR
    invited_by = auth.uid()
  );

-- ==========================================
-- RLS Policies for: notification_preferences
-- ==========================================
DROP POLICY IF EXISTS notification_preferences_own_access ON public.notification_preferences;
CREATE POLICY notification_preferences_own_access ON public.notification_preferences
  FOR ALL USING (
    user_id = auth.uid()
  );

-- ==========================================
-- RLS Policies for: push_subscriptions
-- ==========================================
DROP POLICY IF EXISTS push_subscriptions_own_access ON public.push_subscriptions;
CREATE POLICY push_subscriptions_own_access ON public.push_subscriptions
  FOR ALL USING (
    user_id = auth.uid()
  );

-- ==========================================
-- RLS Policies for: notification_log
-- ==========================================
DROP POLICY IF EXISTS notification_log_own_access ON public.notification_log;
CREATE POLICY notification_log_own_access ON public.notification_log
  FOR SELECT USING (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS notification_log_admin_all ON public.notification_log;
CREATE POLICY notification_log_admin_all ON public.notification_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users_unified
      WHERE users_unified.id = auth.uid()
        AND users_unified.role = 'ADMIN'
    )
  );

-- ==========================================
-- RLS Policies for: audit_log
-- ==========================================
DROP POLICY IF EXISTS audit_log_tenant_admin ON public.audit_log;
CREATE POLICY audit_log_tenant_admin ON public.audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = audit_log.tenant_id
        AND tur.user_id = auth.uid()
        AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
    )
  );

-- ==========================================
-- RLS Policies for: period_locks
-- ==========================================
DROP POLICY IF EXISTS period_locks_tenant_access ON public.period_locks;
CREATE POLICY period_locks_tenant_access ON public.period_locks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = period_locks.tenant_id
        AND tur.user_id = auth.uid()
        AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
    )
  );

-- ==========================================
-- RLS Policies for: tenant_settings
-- ==========================================
DROP POLICY IF EXISTS tenant_settings_admin_access ON public.tenant_settings;
CREATE POLICY tenant_settings_admin_access ON public.tenant_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = tenant_settings.tenant_id
        AND tur.user_id = auth.uid()
        AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
    )
  );

-- Verification
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  IF policy_count >= 30 THEN
    RAISE NOTICE '✅ Layer 12 RLS policies created successfully (% policies)', policy_count;
  ELSE
    RAISE NOTICE '⚠️  Layer 12 RLS policies created (% policies, expected 30+)', policy_count;
  END IF;
END $$;

