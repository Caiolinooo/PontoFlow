-- Migration: Make 'tipo' column nullable in timesheet_entries
-- This allows the system to work with environment_id without requiring tipo
-- The tipo field is being deprecated in favor of environment_id

-- Step 1: Make tipo column nullable
ALTER TABLE public.timesheet_entries 
ALTER COLUMN tipo DROP NOT NULL;

-- Step 2: Add a comment explaining the deprecation
COMMENT ON COLUMN public.timesheet_entries.tipo IS 
'DEPRECATED: This field is being replaced by environment_id. Will be removed in a future version. For backward compatibility, it is now nullable.';

-- Step 3: Update existing entries that have environment_id but no tipo
-- Set tipo based on environment slug for backward compatibility
UPDATE public.timesheet_entries te
SET tipo = e.slug
FROM public.environments e
WHERE te.environment_id = e.id
  AND (te.tipo IS NULL OR te.tipo = '');

-- Step 4: Verification - Check entries without tipo
SELECT 
    COUNT(*) as total_entries,
    COUNT(tipo) as entries_with_tipo,
    COUNT(environment_id) as entries_with_environment,
    COUNT(*) - COUNT(tipo) as entries_without_tipo
FROM public.timesheet_entries;

-- Step 5: Check if there are any entries with neither tipo nor environment_id
SELECT 
    id,
    data,
    timesheet_id,
    tipo,
    environment_id
FROM public.timesheet_entries
WHERE tipo IS NULL AND environment_id IS NULL
LIMIT 10;

