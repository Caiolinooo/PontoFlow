-- Migration: Add tenant branding support to settings JSONB field
-- Date: 2025-01-04
-- Purpose: Enable multi-tenant branding in email templates and UI

-- Description:
-- The tenants.settings JSONB field will store branding configuration including:
-- - logo_url: URL to tenant's logo image
-- - banner_url: URL to tenant's banner image (for emails)
-- - watermark_url: URL to tenant's watermark image
-- - primary_color: Hex color code for primary brand color
-- - secondary_color: Hex color code for secondary brand color
-- - company_name_override: Optional override for company name in emails

-- Example branding structure:
-- {
--   "branding": {
--     "logo_url": "https://example.com/logo.png",
--     "banner_url": "https://example.com/banner.png",
--     "watermark_url": "https://example.com/watermark.png",
--     "primary_color": "#005dff",
--     "secondary_color": "#6339F5",
--     "company_name_override": "My Company"
--   }
-- }

-- No schema changes needed - settings field already exists as JSONB
-- This migration documents the structure and provides example updates

-- Example: Update ABZ Group tenant with branding
-- UPDATE tenants 
-- SET settings = jsonb_set(
--   COALESCE(settings, '{}'::jsonb),
--   '{branding}',
--   '{
--     "logo_url": "https://your-cdn.com/abz-logo.png",
--     "primary_color": "#005dff",
--     "secondary_color": "#6339F5"
--   }'::jsonb
-- )
-- WHERE slug = 'abz-group';

-- Example: Update Omega tenant with branding
-- UPDATE tenants 
-- SET settings = jsonb_set(
--   COALESCE(settings, '{}'::jsonb),
--   '{branding}',
--   '{
--     "logo_url": "https://your-cdn.com/omega-logo.png",
--     "primary_color": "#1e40af",
--     "secondary_color": "#7c3aed"
--   }'::jsonb
-- )
-- WHERE slug = 'omega';

-- Query to retrieve tenant branding:
-- SELECT 
--   id,
--   name,
--   settings->'branding' as branding
-- FROM tenants
-- WHERE id = 'tenant-id-here';

-- Verification query:
-- SELECT 
--   id,
--   name,
--   settings->'branding'->>'logo_url' as logo_url,
--   settings->'branding'->>'primary_color' as primary_color,
--   settings->'branding'->>'secondary_color' as secondary_color
-- FROM tenants;

