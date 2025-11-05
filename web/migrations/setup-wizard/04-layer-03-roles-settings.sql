-- ==========================================
-- Database Setup Wizard - Layer 3: Roles & Settings Tables
-- ==========================================
-- Purpose: Create role-based access control and settings tables
-- Dependencies: Layer 1 (tenants), Layer 2 (profiles, users_unified)
-- Order: 4
-- Tables: tenant_user_roles, tenant_settings, user_invitations, notification_preferences, push_subscriptions
-- ==========================================

-- ==========================================
-- Table: tenant_user_roles
-- ==========================================
-- Role-based access control per tenant
CREATE TABLE IF NOT EXISTS public.tenant_user_roles (
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('COLAB', 'GERENTE', 'TENANT_ADMIN', 'ADMIN_GLOBAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, user_id, role)
);

-- Enable RLS
ALTER TABLE public.tenant_user_roles ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.tenant_user_roles IS 'Role-based access control per tenant';
COMMENT ON COLUMN public.tenant_user_roles.role IS 'User role: COLAB, GERENTE, TENANT_ADMIN, ADMIN_GLOBAL';

-- ==========================================
-- Table: tenant_settings
-- ==========================================
-- Tenant-specific configuration settings
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_password TEXT,
  smtp_from_email TEXT,
  smtp_from_name TEXT,
  smtp_secure BOOLEAN DEFAULT TRUE,
  branding_logo_url TEXT,
  branding_primary_color TEXT,
  branding_secondary_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.tenant_settings IS 'Tenant-specific configuration settings';
COMMENT ON COLUMN public.tenant_settings.smtp_host IS 'SMTP server hostname';
COMMENT ON COLUMN public.tenant_settings.branding_logo_url IS 'Tenant logo URL';

-- ==========================================
-- Table: user_invitations
-- ==========================================
-- User invitation system
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  position TEXT,
  department TEXT,
  role TEXT NOT NULL CHECK (role IN ('USER', 'MANAGER_TIMESHEET', 'MANAGER', 'ADMIN')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES public.users_unified(id) ON DELETE CASCADE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  accepted_at TIMESTAMPTZ,
  tenant_ids UUID[] DEFAULT '{}',
  group_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.user_invitations IS 'User invitation system';
COMMENT ON COLUMN public.user_invitations.token IS 'Unique invitation token';
COMMENT ON COLUMN public.user_invitations.status IS 'Invitation status: pending, accepted, expired, cancelled';
COMMENT ON COLUMN public.user_invitations.tenant_ids IS 'Array of tenant IDs to assign';
COMMENT ON COLUMN public.user_invitations.group_ids IS 'Array of group IDs to assign';

-- ==========================================
-- Table: notification_preferences
-- ==========================================
-- User notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  timesheet_submitted BOOLEAN NOT NULL DEFAULT TRUE,
  timesheet_approved BOOLEAN NOT NULL DEFAULT TRUE,
  timesheet_rejected BOOLEAN NOT NULL DEFAULT TRUE,
  comment_added BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.notification_preferences IS 'User notification preferences';
COMMENT ON COLUMN public.notification_preferences.email_enabled IS 'Enable email notifications';
COMMENT ON COLUMN public.notification_preferences.push_enabled IS 'Enable push notifications';

-- ==========================================
-- Table: push_subscriptions
-- ==========================================
-- Web push notification subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  auth TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.push_subscriptions IS 'Web push notification subscriptions';
COMMENT ON COLUMN public.push_subscriptions.endpoint IS 'Push service endpoint URL';
COMMENT ON COLUMN public.push_subscriptions.auth IS 'Push subscription auth key';
COMMENT ON COLUMN public.push_subscriptions.p256dh IS 'Push subscription p256dh key';

-- Verification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tenant_user_roles')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tenant_settings')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_invitations')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notification_preferences')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'push_subscriptions')
  THEN
    RAISE NOTICE '✅ Layer 3 tables created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create Layer 3 tables';
  END IF;
END $$;

