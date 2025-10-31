-- Migration: Fix existing tipo values that violate the check constraint
-- This script updates existing rows to use valid tipo values

-- Step 1: First, let's see what values we have
DO $$
DECLARE
    bad_tipo text;
BEGIN
    -- Update problematic values to valid ones
    -- Map environment-related slugs to valid tipos
    
    -- Update "Almoço Start" to "trabalho"
    UPDATE public.timesheet_entries 
    SET tipo = 'trabalho' 
    WHERE tipo = 'Almoço Start';
    
    -- Update any other problematic values
    -- This is a safe approach - we'll identify and fix specific violations
    
    RAISE NOTICE 'Fixed existing tipo values';
END $$;

-- Step 2: Verify the update
SELECT 
    tipo,
    COUNT(*) as usage_count
FROM public.timesheet_entries
WHERE tipo IS NOT NULL
GROUP BY tipo
ORDER BY tipo;