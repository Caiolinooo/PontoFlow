-- Migration: Create environments from existing tipos in timesheet_entries
-- This script creates environment records based on the tipos used in existing timesheet entries
-- and links those entries to the newly created environments

-- Step 1: Create environments based on existing tipos
INSERT INTO public.environments (tenant_id, name, slug, color, auto_fill_enabled)
SELECT DISTINCT 
  t.id as tenant_id,
  CASE 
    WHEN te.tipo = 'embarque' THEN 'Embarque'
    WHEN te.tipo = 'desembarque' THEN 'Desembarque'
    WHEN te.tipo = 'translado' THEN 'Translado'
    WHEN te.tipo = 'onshore' THEN 'Onshore'
    WHEN te.tipo = 'offshore' THEN 'Offshore'
    WHEN te.tipo = 'folga' THEN 'Folga'
    ELSE INITCAP(te.tipo)
  END as name,
  te.tipo as slug,
  CASE 
    WHEN te.tipo = 'embarque' THEN '#3B82F6'
    WHEN te.tipo = 'desembarque' THEN '#6366F1'
    WHEN te.tipo = 'translado' THEN '#F59E0B'
    WHEN te.tipo = 'onshore' THEN '#10B981'
    WHEN te.tipo = 'offshore' THEN '#0EA5E9'
    WHEN te.tipo = 'folga' THEN '#6B7280'
    ELSE '#3B82F6'
  END as color,
  CASE 
    WHEN te.tipo IN ('embarque', 'desembarque', 'offshore') THEN true
    ELSE false
  END as auto_fill_enabled
FROM public.timesheet_entries te
JOIN public.timesheets ts ON te.timesheet_id = ts.id
JOIN public.tenants t ON ts.tenant_id = t.id
WHERE te.tipo IS NOT NULL
ON CONFLICT (tenant_id, slug) DO UPDATE
SET 
  color = EXCLUDED.color,
  auto_fill_enabled = EXCLUDED.auto_fill_enabled;

-- Step 2: Update existing timesheet_entries to link to environments
UPDATE public.timesheet_entries te
SET environment_id = e.id
FROM public.environments e
JOIN public.timesheets ts ON te.timesheet_id = ts.id
WHERE te.environment_id IS NULL
  AND e.tenant_id = ts.tenant_id
  AND e.slug = te.tipo;

-- Step 3: Verification queries
-- Check how many entries still don't have an environment
SELECT 
  COUNT(*) as entries_without_environment,
  COUNT(DISTINCT tipo) as distinct_tipos
FROM public.timesheet_entries
WHERE environment_id IS NULL;

-- List all environments created per tenant
SELECT 
  t.name as tenant_name,
  e.name as environment_name,
  e.slug,
  e.color,
  e.auto_fill_enabled,
  COUNT(te.id) as entry_count
FROM public.environments e
JOIN public.tenants t ON e.tenant_id = t.id
LEFT JOIN public.timesheet_entries te ON te.environment_id = e.id
GROUP BY t.name, e.name, e.slug, e.color, e.auto_fill_enabled
ORDER BY t.name, e.name;

