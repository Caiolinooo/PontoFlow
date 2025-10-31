-- Phase 20: Add environment_id to timesheet_entries
-- Allows tracking which work environment (location) each entry belongs to

-- Add environment_id column to timesheet_entries
alter table public.timesheet_entries
add column if not exists environment_id uuid references public.environments(id) on delete set null;

-- Create index for faster queries
create index if not exists idx_entries_environment on public.timesheet_entries(environment_id);

-- Add comment for documentation
comment on column public.timesheet_entries.environment_id is 'Work environment (location) where this entry occurred. Each tenant has its own environments.';

-- Example environments that tenants might create:
-- - Onshore (escritório)
-- - Offshore (plataforma)
-- - Embarcação A
-- - Embarcação B
-- - Home Office
-- - Cliente X
-- etc.

