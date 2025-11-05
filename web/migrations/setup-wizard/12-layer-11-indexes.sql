-- ==========================================
-- Database Setup Wizard - Layer 11: Performance Indexes
-- ==========================================
-- Purpose: Create all performance indexes
-- Dependencies: All tables (Layers 1-8)
-- Order: 12
-- Indexes: 80+ indexes for query optimization
-- ==========================================

-- ==========================================
-- Indexes for: tenants
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_timezone ON public.tenants(timezone);

-- ==========================================
-- Indexes for: environments
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_environments_tenant ON public.environments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_environments_tenant_slug ON public.environments(tenant_id, slug);

-- ==========================================
-- Indexes for: profiles
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_active_locale ON public.profiles(ativo, locale);

-- ==========================================
-- Indexes for: users_unified
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_users_unified_email ON public.users_unified(email);
CREATE INDEX IF NOT EXISTS idx_users_unified_role ON public.users_unified(role);
CREATE INDEX IF NOT EXISTS idx_users_unified_active ON public.users_unified(is_active);

-- ==========================================
-- Indexes for: tenant_user_roles
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_tenant_user_roles_user ON public.tenant_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_user_roles_tenant ON public.tenant_user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_user_roles_role ON public.tenant_user_roles(role);

-- ==========================================
-- Indexes for: groups
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_groups_tenant ON public.groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_groups_tenant_name ON public.groups(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_groups_environment ON public.groups(environment_id);

-- ==========================================
-- Indexes for: manager_group_assignments
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_manager_group_assignments_manager ON public.manager_group_assignments(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_group_assignments_group ON public.manager_group_assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_manager_group_assignments_tenant ON public.manager_group_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_manager_group_assignments_tenant_manager ON public.manager_group_assignments(tenant_id, manager_id);

-- ==========================================
-- Indexes for: employee_group_members
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_employee_group_members_employee ON public.employee_group_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_group_members_group ON public.employee_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_employee_group_members_tenant ON public.employee_group_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_group_members_tenant_employee ON public.employee_group_members(tenant_id, employee_id);

-- ==========================================
-- Indexes for: vessels
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_vessels_tenant ON public.vessels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vessels_code ON public.vessels(code);

-- ==========================================
-- Indexes for: vessel_group_links
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_vessel_group_links_vessel ON public.vessel_group_links(vessel_id);
CREATE INDEX IF NOT EXISTS idx_vessel_group_links_group ON public.vessel_group_links(group_id);
CREATE INDEX IF NOT EXISTS idx_vessel_group_links_tenant ON public.vessel_group_links(tenant_id);

-- ==========================================
-- Indexes for: employees
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON public.employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_profile ON public.employees(profile_id);
CREATE INDEX IF NOT EXISTS idx_employees_profile_tenant ON public.employees(profile_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_profile ON public.employees(tenant_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_name ON public.employees(tenant_id, display_name);
CREATE INDEX IF NOT EXISTS idx_employees_vessel ON public.employees(vessel_id);

-- ==========================================
-- Indexes for: timesheets
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_timesheets_tenant ON public.timesheets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_employee ON public.timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_tenant_status ON public.timesheets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_timesheets_tenant_periodo ON public.timesheets(tenant_id, periodo_ini, periodo_fim);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON public.timesheets(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_periodo ON public.timesheets(periodo_ini, periodo_fim);

-- ==========================================
-- Indexes for: timesheet_entries
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_timesheet ON public.timesheet_entries(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_tenant ON public.timesheet_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_environment ON public.timesheet_entries(environment_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_data ON public.timesheet_entries(data);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_tipo ON public.timesheet_entries(tipo);

-- ==========================================
-- Indexes for: approvals
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_approvals_timesheet ON public.approvals(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_approvals_tenant ON public.approvals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver ON public.approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_approvals_action ON public.approvals(action);

-- ==========================================
-- Indexes for: comments
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_comments_timesheet ON public.comments(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_comments_tenant ON public.comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.comments(author_id);

-- ==========================================
-- Indexes for: notifications
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON public.notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, lido);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_event ON public.notifications(event);

-- ==========================================
-- Indexes for: timesheet_annotations
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_timesheet_annotations_timesheet ON public.timesheet_annotations(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_annotations_entry ON public.timesheet_annotations(entry_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_annotations_tenant ON public.timesheet_annotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_annotations_author ON public.timesheet_annotations(author_id);

-- ==========================================
-- Indexes for: password_reset_tokens
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON public.password_reset_tokens(expires_at);

-- ==========================================
-- Indexes for: user_invitations
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON public.user_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires ON public.user_invitations(expires_at);

-- ==========================================
-- Indexes for: notification_preferences
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON public.notification_preferences(user_id);

-- ==========================================
-- Indexes for: push_subscriptions
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

-- ==========================================
-- Indexes for: notification_log
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_notification_log_user ON public.notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON public.notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON public.notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_event ON public.notification_log(event);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON public.notification_log(created_at DESC);

-- ==========================================
-- Indexes for: audit_log
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON public.audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

-- ==========================================
-- Indexes for: period_locks
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_period_locks_tenant ON public.period_locks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_period_locks_period ON public.period_locks(period_month);
CREATE INDEX IF NOT EXISTS idx_period_locks_tenant_period ON public.period_locks(tenant_id, period_month);

-- ==========================================
-- Indexes for: tenant_settings
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant ON public.tenant_settings(tenant_id);

-- Verification
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';

  IF index_count >= 80 THEN
    RAISE NOTICE '✅ Layer 11 indexes created successfully (% indexes)', index_count;
  ELSE
    RAISE NOTICE '⚠️  Layer 11 indexes created (% indexes, expected 80+)', index_count;
  END IF;
END $$;

