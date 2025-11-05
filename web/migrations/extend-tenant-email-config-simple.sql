-- Migration: Extend tenant email configuration (Simplified Version)
-- Date: 2025-01-04
-- Execute this in Supabase Dashboard → SQL Editor

-- Step 1: Update comment to document extended email settings structure
COMMENT ON COLUMN public.tenants.settings IS 
'JSONB field for tenant-specific settings including:
- email: Complete email configuration (provider, smtp, oauth2, sendgrid, ses, deliverability)
- smtp: Legacy per-tenant SMTP override (deprecated, use email.smtp instead)
- branding: Tenant branding (logo_url, banner_url, watermark_url, primary_color, secondary_color)
- notifications: Notification preferences
- features: Feature flags';

-- Step 2: Create index for tenants with email configured
CREATE INDEX IF NOT EXISTS idx_tenants_email_configured 
ON public.tenants ((settings->'email'->>'provider'))
WHERE settings ? 'email';

-- Done! The email configuration is now ready to use.
-- No validation constraints are added to allow flexibility.

