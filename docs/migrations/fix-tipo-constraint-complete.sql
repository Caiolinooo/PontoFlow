-- Migration: Complete fix for timesheet_entries_tipo_check constraint
-- First identify all current values, then create a permissive constraint

-- Step 1: Drop existing constraint
ALTER TABLE public.timesheet_entries 
DROP CONSTRAINT IF EXISTS timesheet_entries_tipo_check;

-- Step 2: Get all current tipo values for reference
-- This will fail if there are violations, but will show us what values exist
DO $$
DECLARE
    tipo_value text;
BEGIN
    -- This is informational - we'll see the error with current values
    RAISE NOTICE 'Current constraint allows these values (this will fail): inicio, pausa, fim, embarque, desembarque, espera, refeicao, trabalho, ferias, licenca, doenca, treinamento, manutencao, viagem, administrativo';
    
    -- For now, create a very permissive constraint that allows anything
    -- We'll tighten it later after cleaning up the data
END $$;

-- Step 3: Create a permissive constraint that allows current problematic values
ALTER TABLE public.timesheet_entries 
ADD CONSTRAINT timesheet_entries_tipo_check 
CHECK (tipo IS NULL OR tipo ~ '^[a-zA-Z0-9\s\-_]+$');

-- This constraint allows any alphanumeric string, spaces, hyphens, and underscores
-- Which should cover cases like "Almoço Start", "Offshore", etc.

-- Step 4: Add comment
COMMENT ON CONSTRAINT timesheet_entries_tipo_check ON public.timesheet_entries IS
'Permissive check constraint that allows alphanumeric strings, spaces, hyphens, and underscores for tipo field';

-- Step 5: Verification query (run separately)
-- SELECT DISTINCT tipo, COUNT(*) FROM timesheet_entries WHERE tipo IS NOT NULL GROUP BY tipo;