-- Phase 22: Environment Colors and Auto-fill Configuration
-- Add color field to environments and auto-fill settings

-- Add color field to environments table
ALTER TABLE public.environments
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';

-- Add auto_fill_enabled to environments
ALTER TABLE public.environments
ADD COLUMN IF NOT EXISTS auto_fill_enabled BOOLEAN DEFAULT true;

-- Add comment
COMMENT ON COLUMN public.environments.color IS 'Hex color code for calendar display (e.g., #3B82F6)';
COMMENT ON COLUMN public.environments.auto_fill_enabled IS 'Enable auto-fill for this environment';

-- Add auto-fill settings to tenant_settings
ALTER TABLE public.tenant_settings
ADD COLUMN IF NOT EXISTS auto_fill_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.tenant_settings
ADD COLUMN IF NOT EXISTS auto_fill_past_days BOOLEAN DEFAULT false;

ALTER TABLE public.tenant_settings
ADD COLUMN IF NOT EXISTS auto_fill_future_days BOOLEAN DEFAULT true;

-- Add comments
COMMENT ON COLUMN public.tenant_settings.auto_fill_enabled IS 'Enable auto-fill functionality globally for tenant';
COMMENT ON COLUMN public.tenant_settings.auto_fill_past_days IS 'Allow auto-fill to create entries for past days in the period';
COMMENT ON COLUMN public.tenant_settings.auto_fill_future_days IS 'Allow auto-fill to create entries for future days in the period';

-- Update existing environments with default colors (optional)
-- You can customize these colors based on common environment types
UPDATE public.environments
SET color = CASE
  WHEN LOWER(name) LIKE '%offshore%' OR LOWER(slug) LIKE '%offshore%' THEN '#0EA5E9'
  WHEN LOWER(name) LIKE '%onshore%' OR LOWER(slug) LIKE '%onshore%' THEN '#10B981'
  WHEN LOWER(name) LIKE '%embarca%' OR LOWER(slug) LIKE '%embarca%' THEN '#3B82F6'
  WHEN LOWER(name) LIKE '%folga%' OR LOWER(slug) LIKE '%folga%' THEN '#6B7280'
  WHEN LOWER(name) LIKE '%translado%' OR LOWER(slug) LIKE '%translado%' THEN '#F59E0B'
  ELSE '#3B82F6'
END
WHERE color IS NULL OR color = '#3B82F6';

