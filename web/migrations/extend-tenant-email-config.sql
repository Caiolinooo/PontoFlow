-- Migration: Extend tenant email configuration to support full email setup
-- Date: 2025-01-04
-- Description: Extends tenants.settings.email to support complete email configuration per tenant

-- Expected email settings structure in tenants.settings JSONB:
-- {
--   "email": {
--     "provider": "smtp|gmail|exchange-oauth2|sendgrid|ses",
--     "smtp": {
--       "host": "smtp.example.com",
--       "port": 587,
--       "user": "email@domain.com",
--       "password_encrypted": "...",
--       "from": "email@domain.com",
--       "from_name": "Company Name",
--       "secure": true,
--       "tls": {
--         "rejectUnauthorized": true
--       }
--     },
--     "oauth2": {
--       "tenant_id": "azure-tenant-id",
--       "client_id": "azure-client-id",
--       "client_secret_encrypted": "...",
--       "user": "email@domain.com"
--     },
--     "sendgrid": {
--       "api_key_encrypted": "...",
--       "from": "email@domain.com",
--       "from_name": "Company Name"
--     },
--     "ses": {
--       "region": "us-east-1",
--       "access_key_id": "...",
--       "secret_access_key_encrypted": "...",
--       "from": "email@domain.com",
--       "from_name": "Company Name"
--     },
--     "deliverability": {
--       "spf_record": "v=spf1 include:spf.protection.outlook.com ~all",
--       "dkim_selector": "selector1",
--       "dkim_domain": "domain.com",
--       "dkim_public_key": "...",
--       "dkim_private_key_encrypted": "...",
--       "dmarc_policy": "v=DMARC1; p=quarantine; rua=mailto:dmarc@domain.com",
--       "return_path": "bounce@domain.com"
--     }
--   },
--   "smtp": { ... },  -- Legacy per-tenant SMTP (kept for backward compatibility)
--   "branding": { ... },
--   ...
-- }

-- Update comment to document extended email settings structure
COMMENT ON COLUMN public.tenants.settings IS 
'JSONB field for tenant-specific settings including:
- email: Complete email configuration (provider, smtp, oauth2, sendgrid, ses, deliverability)
- smtp: Legacy per-tenant SMTP override (deprecated, use email.smtp instead)
- branding: Tenant branding (logo_url, banner_url, watermark_url, primary_color, secondary_color)
- notifications: Notification preferences
- features: Feature flags';

-- Create validation function for email settings
CREATE OR REPLACE FUNCTION validate_email_settings(settings jsonb)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- If email settings exist, validate structure
  IF settings ? 'email' THEN
    -- Validate provider
    IF NOT (settings->'email'->>'provider' IN ('smtp', 'gmail', 'exchange-oauth2', 'sendgrid', 'ses')) THEN
      RAISE EXCEPTION 'Invalid email provider. Must be one of: smtp, gmail, exchange-oauth2, sendgrid, ses';
    END IF;
    
    -- Validate SMTP settings if provider is smtp or gmail
    IF settings->'email'->>'provider' IN ('smtp', 'gmail') THEN
      IF NOT (settings->'email' ? 'smtp') THEN
        RAISE EXCEPTION 'SMTP settings required for smtp/gmail provider';
      END IF;
      
      IF NOT (
        settings->'email'->'smtp' ? 'host' AND
        settings->'email'->'smtp' ? 'port' AND
        settings->'email'->'smtp' ? 'user' AND
        settings->'email'->'smtp' ? 'password_encrypted' AND
        settings->'email'->'smtp' ? 'from'
      ) THEN
        RAISE EXCEPTION 'SMTP settings must include: host, port, user, password_encrypted, from';
      END IF;
    END IF;
    
    -- Validate OAuth2 settings if provider is exchange-oauth2
    IF settings->'email'->>'provider' = 'exchange-oauth2' THEN
      IF NOT (settings->'email' ? 'oauth2') THEN
        RAISE EXCEPTION 'OAuth2 settings required for exchange-oauth2 provider';
      END IF;
      
      IF NOT (
        settings->'email'->'oauth2' ? 'tenant_id' AND
        settings->'email'->'oauth2' ? 'client_id' AND
        settings->'email'->'oauth2' ? 'client_secret_encrypted'
      ) THEN
        RAISE EXCEPTION 'OAuth2 settings must include: tenant_id, client_id, client_secret_encrypted';
      END IF;
    END IF;
  END IF;
  
  RETURN true;
END;
$$;

-- Add check constraint for email settings validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_email_settings_valid'
  ) THEN
    ALTER TABLE public.tenants
    ADD CONSTRAINT check_email_settings_valid
    CHECK (validate_email_settings(settings));
  END IF;
END $$;

-- Create index for tenants with email configured
CREATE INDEX IF NOT EXISTS idx_tenants_email_configured 
ON public.tenants ((settings->'email'->>'provider'))
WHERE settings ? 'email';

-- Grant execute permission on validation function
GRANT EXECUTE ON FUNCTION validate_email_settings(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_email_settings(jsonb) TO service_role;

