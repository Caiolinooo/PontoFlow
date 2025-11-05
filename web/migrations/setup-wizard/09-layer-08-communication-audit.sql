-- ==========================================
-- Database Setup Wizard - Layer 8: Communication & Audit Tables
-- ==========================================
-- Purpose: Create comments, notifications, and audit logging tables
-- Dependencies: Layer 6 (timesheets)
-- Order: 9
-- Tables: comments, notifications, notification_log, audit_log
-- ==========================================

-- ==========================================
-- Table: comments
-- ==========================================
-- Comment system for timesheets
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  timesheet_id UUID NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.comments IS 'Comment system for timesheets';
COMMENT ON COLUMN public.comments.author_id IS 'User ID who created the comment';
COMMENT ON COLUMN public.comments.texto IS 'Comment text';

-- ==========================================
-- Table: notifications
-- ==========================================
-- In-app notification system
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('info', 'success', 'warning', 'error')),
  lido BOOLEAN NOT NULL DEFAULT FALSE,
  lido_em TIMESTAMPTZ,
  link TEXT,
  event TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.notifications IS 'In-app notification system';
COMMENT ON COLUMN public.notifications.user_id IS 'Target user ID';
COMMENT ON COLUMN public.notifications.tipo IS 'Notification type: info, success, warning, error';
COMMENT ON COLUMN public.notifications.lido IS 'Read status';
COMMENT ON COLUMN public.notifications.event IS 'Event type that triggered notification';

-- ==========================================
-- Table: notification_log
-- ==========================================
-- Notification delivery log (email, push, etc.)
CREATE TABLE IF NOT EXISTS public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'push', 'sms')),
  event TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.notification_log IS 'Notification delivery log';
COMMENT ON COLUMN public.notification_log.notification_type IS 'Type: email, push, sms';
COMMENT ON COLUMN public.notification_log.event IS 'Event that triggered notification';
COMMENT ON COLUMN public.notification_log.status IS 'Delivery status: pending, sent, failed, bounced';

-- ==========================================
-- Table: audit_log
-- ==========================================
-- System-wide audit logging
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.audit_log IS 'System-wide audit logging';
COMMENT ON COLUMN public.audit_log.action IS 'Action performed (CREATE, UPDATE, DELETE, etc.)';
COMMENT ON COLUMN public.audit_log.entity_type IS 'Type of entity affected';
COMMENT ON COLUMN public.audit_log.entity_id IS 'ID of entity affected';
COMMENT ON COLUMN public.audit_log.old_values IS 'Previous values (JSON)';
COMMENT ON COLUMN public.audit_log.new_values IS 'New values (JSON)';

-- Verification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'comments')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notifications')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notification_log')
    AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'audit_log')
  THEN
    RAISE NOTICE '✅ Layer 8 tables created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create Layer 8 tables';
  END IF;
END $$;

