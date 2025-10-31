-- Debug: Check current structure and values in timesheet_entries table
-- This will help identify the root cause of the tipo_check constraint violation

-- 1. Check current constraint definition
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name = 'timesheet_entries_tipo_check';

-- 2. Check what tipo values currently exist in the table
SELECT 
    tipo,
    COUNT(*) as usage_count,
    STRING_AGG(DISTINCT environment_id::text, ', ') as environment_ids
FROM public.timesheet_entries
WHERE tipo IS NOT NULL
GROUP BY tipo
ORDER BY tipo;

-- 3. Check environments table to understand the relationship
SELECT 
    id,
    name,
    slug,
    tipo
FROM public.environments
ORDER BY name;

-- 4. Check some sample entries to understand the data pattern
SELECT 
    id,
    data,
    environment_id,
    tipo,
    observacao,
    created_at
FROM public.timesheet_entries
WHERE tipo IS NOT NULL
LIMIT 10;

-- 5. Check for any problematic environment slugs that might be used as tipo
SELECT DISTINCT
    e.slug as environment_slug,
    e.name as environment_name,
    COUNT(te.id) as usage_count
FROM public.environments e
LEFT JOIN public.timesheet_entries te ON te.environment_id = e.id AND te.tipo = e.slug
GROUP BY e.id, e.slug, e.name
HAVING COUNT(te.id) > 0
ORDER BY usage_count DESC;