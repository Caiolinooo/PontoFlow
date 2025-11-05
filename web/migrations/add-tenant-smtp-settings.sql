-- Migration: Add SMTP configuration support to tenants
-- Date: 2025-01-04
-- Description: Allows each tenant to configure their own SMTP settings for sending emails

-- The tenants table already has a settings JSONB field
-- This migration documents the expected structure for SMTP settings

-- Expected SMTP settings structure in tenants.settings JSONB:
-- {
--   "smtp": {
--     "enabled": true,
--     "host": "smtp.office365.com",
--     "port": 587,
--     "user": "noreply@tenant-domain.com",
--     "password_encrypted": "encrypted_password_here",
--     "from": "noreply@tenant-domain.com",
--     "from_name": "Tenant Name"
--   },
--   "branding": { ... },
--   ...
-- }

-- Add comment to document SMTP settings structure
COMMENT ON COLUMN public.tenants.settings IS 
'JSONB field for tenant-specific settings including:
- smtp: SMTP email configuration (host, port, user, password_encrypted, from, from_name, enabled)
- branding: Tenant branding (logo_url, banner_url, watermark_url, primary_color, secondary_color)
- notifications: Notification preferences
- features: Feature flags';

-- Create a function to validate SMTP settings structure
CREATE OR REPLACE FUNCTION validate_smtp_settings(settings JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- If smtp key doesn't exist, it's valid (optional)
  IF NOT (settings ? 'smtp') THEN
    RETURN TRUE;
  END IF;

  -- If smtp exists, validate required fields
  IF NOT (
    (settings->'smtp' ? 'host') AND
    (settings->'smtp' ? 'port') AND
    (settings->'smtp' ? 'user') AND
    (settings->'smtp' ? 'from')
  ) THEN
    RETURN FALSE;
  END IF;

  -- Validate port is a number
  IF NOT (jsonb_typeof(settings->'smtp'->'port') = 'number') THEN
    RETURN FALSE;
  END IF;

  -- Validate enabled is a boolean (if present)
  IF (settings->'smtp' ? 'enabled') AND 
     NOT (jsonb_typeof(settings->'smtp'->'enabled') = 'boolean') THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add check constraint to validate SMTP settings
ALTER TABLE public.tenants
ADD CONSTRAINT check_smtp_settings_valid
CHECK (validate_smtp_settings(settings));

-- Create index for tenants with SMTP enabled
CREATE INDEX IF NOT EXISTS idx_tenants_smtp_enabled
ON public.tenants ((settings->'smtp'->>'enabled'))
WHERE (settings->'smtp'->>'enabled')::boolean = true;

-- Example: Update a tenant with SMTP settings
-- UPDATE public.tenants
-- SET settings = jsonb_set(
--   COALESCE(settings, '{}'::jsonb),
--   '{smtp}',
--   '{
--     "enabled": true,
--     "host": "smtp.office365.com",
--     "port": 587,
--     "user": "noreply@example.com",
--     "password_encrypted": "encrypted_password_here",
--     "from": "noreply@example.com",
--     "from_name": "Example Company"
--   }'::jsonb
-- )
-- WHERE id = 'your-tenant-id';

-- Verify the migration
SELECT 
  id,
  name,
  settings->'smtp' as smtp_config,
  (settings->'smtp'->>'enabled')::boolean as smtp_enabled
FROM public.tenants
WHERE settings ? 'smtp';

