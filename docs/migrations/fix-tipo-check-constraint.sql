-- Migration: Fix timesheet_entries_tipo_check constraint
-- The current constraint is rejecting valid values like "inicio"
-- This script drops and recreates the constraint with more permissive values

-- Step 1: Drop the existing constraint
ALTER TABLE public.timesheet_entries 
DROP CONSTRAINT IF EXISTS timesheet_entries_tipo_check;

-- Step 2: Create a new constraint that allows common work types
-- This includes maritime work types and standard work types
ALTER TABLE public.timesheet_entries 
ADD CONSTRAINT timesheet_entries_tipo_check 
CHECK (tipo IS NULL OR tipo IN (
    -- Maritime work types
    'inicio',        -- Work start/boarding
    'pausa',         -- Break/pause
    'fim',           -- Work end/disembarking
    'embarque',      -- Boarding
    'desembarque',   -- Disembarking
    'espera',        -- Waiting
    'refeicao',      -- Meal/break
    -- General work types for flexibility
    'trabalho',      -- General work
    'ferias',        -- Vacation
    'licenca',       -- License/leave
    'doenca',        -- Sick leave
    'treinamento',   -- Training
    'manutencao',    -- Maintenance
    'viagem',        -- Travel
    'administrativo' -- Administrative
));

-- Step 3: Add comment for documentation
COMMENT ON CONSTRAINT timesheet_entries_tipo_check ON public.timesheet_entries IS
'Check constraint for tipo field that allows maritime work types and common work status values';

-- Step 4: Verification - Check what values are currently in use
SELECT 
    tipo,
    COUNT(*) as usage_count
FROM public.timesheet_entries
WHERE tipo IS NOT NULL
GROUP BY tipo
ORDER BY tipo;