-- Migration: Complete fix for timesheet_entries_tipo_check constraint
-- Drop constraint, fix data, recreate with correct values

-- Step 1: Drop the existing constraint
ALTER TABLE public.timesheet_entries 
DROP CONSTRAINT IF EXISTS timesheet_entries_tipo_check;

-- Step 2: Update any problematic tipo values to valid ones
UPDATE public.timesheet_entries 
SET tipo = CASE 
    WHEN tipo = 'Almoço Start' THEN 'trabalho'
    WHEN tipo = 'Offshore' THEN 'trabalho'
    WHEN tipo = 'Embarque' THEN 'embarque'
    WHEN tipo = 'Desembarque' THEN 'desembarque'
    WHEN tipo = 'Folga' THEN 'ferias'
    ELSE tipo
END
WHERE tipo IN ('Almoço Start', 'Offshore', 'Embarque', 'Desembarque', 'Folga');

-- Step 3: Recreate the constraint with all valid values
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

-- Step 4: Add comment for documentation
COMMENT ON CONSTRAINT timesheet_entries_tipo_check ON public.timesheet_entries IS
'Check constraint for tipo field that allows maritime work types and common work status values';

-- Step 5: Verification
SELECT 
    tipo,
    COUNT(*) as usage_count
FROM public.timesheet_entries
WHERE tipo IS NOT NULL
GROUP BY tipo
ORDER BY tipo;