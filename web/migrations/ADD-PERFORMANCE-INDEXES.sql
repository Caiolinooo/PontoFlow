-- Performance indexes (ground-truth: pg_indexes introspection 2026-09-23)
-- Idempotent: CREATE INDEX IF NOT EXISTS. Safe to re-run.
-- Covers the 4 hottest uncovered query paths:
--   1. Manager pending queue (polled, filters tenant+status+period)
--   2. Employee dashboard/alerts (employee+status counts)
--   3. Pending route group->members scan (group_id IN (...) + tenant)
--   4. Admin DP queue (tenant+status+period)

CREATE INDEX IF NOT EXISTS idx_timesheets_tenant_status_period
  ON public.timesheets (tenant_id, status, periodo_ini);

CREATE INDEX IF NOT EXISTS idx_timesheets_employee_status
  ON public.timesheets (employee_id, status);

CREATE INDEX IF NOT EXISTS idx_employee_group_members_group_tenant
  ON public.employee_group_members (group_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_dp_deliveries_tenant_status_period
  ON public.dp_deliveries (tenant_id, status, periodo_ini);
