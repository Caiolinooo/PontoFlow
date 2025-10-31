-- Migration: Fix timesheet_entries_tipo_check constraint - Include all current values
-- This script first identifies all current tipo values, then updates the constraint

-- Step 1: Get all current tipo values to include in the new constraint
WITH current_tipos AS (
    SELECT DISTINCT tipo 
    FROM public.timesheet_entries 
    WHERE tipo IS NOT NULL
),
current_environment_slugs AS (
    SELECT DISTINCT slug 
    FROM public.environments 
    WHERE slug IS NOT NULL
)
-- Drop existing constraint
ALTER TABLE public.timesheet_entries 
DROP CONSTRAINT IF EXISTS timesheet_entries_tipo_check;

-- Create new constraint that includes ALL current values + standard values
ALTER TABLE public.timesheet_entries 
ADD CONSTRAINT timesheet_entries_tipo_check 
CHECK (tipo IS NULL OR tipo IN (
    -- All current environment slugs (these are being used as tipo values)
    'Almoço Start', 'Offshore', 'Embarque', 'Desembarque', 'Folga',
    -- Plus all standard work types
    'inicio', 'pausa', 'fim', 'embarque', 'desembarque', 'espera', 
    'refeicao', 'trabalho', 'ferias', 'licenca', 'doenca', 
    'treinamento', 'manutencao', 'viagem', 'administrativo',
    -- Allow any environment slug as tipo for flexibility
    (SELECT slug FROM public.environments WHERE slug IS NOT NULL)
));

-- Step 3: Add comment for documentation
COMMENT ON CONSTRAINT timesheet_entries_tipo_check ON public.timesheet_entries IS
'Check constraint for tipo field that allows environment slugs and standard work types';

-- Step 4: Verification
SELECT 
    tipo,
    COUNT(*) as usage_count
FROM public.timesheet_entries
WHERE tipo IS NOT NULL
GROUP BY tipo
ORDER BY tipo;