-- Migration: Add work_mode to tenants table
-- Purpose: Define the type of work regime for each tenant
-- 
-- Work Modes:
-- - 'offshore': Offshore rotation work (embarque/desembarque with rotation schedules like 28x28)
-- - 'standard': Standard office work (22 working days per month in Brazil, with daily clock-in/out)
-- - 'flexible': Flexible work mode (custom rules per tenant)

-- Add work_mode column
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS work_mode text 
CHECK (work_mode IN ('offshore', 'standard', 'flexible'))
DEFAULT 'standard';

-- Update existing tenants based on their work_schedule
-- If they have offshore-style schedules (7x7, 14x14, 21x21, 28x28), set to offshore
UPDATE public.tenants
SET work_mode = 'offshore'
WHERE work_schedule IN ('7x7', '14x14', '21x21', '28x28');

-- Add comment to explain the column
COMMENT ON COLUMN public.tenants.work_mode IS 
'Work regime type: offshore (rotation schedules), standard (daily clock-in/out), flexible (custom)';

-- Add settings column for additional configurations (JSONB for flexibility)
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS settings jsonb 
DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.tenants.settings IS 
'Additional tenant settings in JSON format. Examples:
- standard mode: {"working_days_per_month": 22, "lunch_duration_minutes": 60}
- offshore mode: {"auto_fill_enabled": true}
- flexible mode: custom rules';

