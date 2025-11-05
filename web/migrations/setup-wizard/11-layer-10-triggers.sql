-- ==========================================
-- Database Setup Wizard - Layer 10: Database Triggers
-- ==========================================
-- Purpose: Create all database triggers
-- Dependencies: Layer 9 (functions), All tables
-- Order: 11
-- Triggers: 5+ triggers for automation
-- ==========================================

-- ==========================================
-- Trigger Function: handle_new_user
-- ==========================================
-- Creates a profile when a new user is created in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    display_name,
    email,
    phone,
    ativo,
    locale,
    created_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.email,
    NEW.phone,
    TRUE,
    COALESCE(NEW.raw_user_meta_data->>'locale', 'pt-BR'),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile for new auth.users';

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- Trigger Function: sync_profile_to_users_unified
-- ==========================================
-- Syncs profiles to users_unified (ABZ Group specific)
CREATE OR REPLACE FUNCTION public.sync_profile_to_users_unified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sync_enabled TEXT;
BEGIN
  -- Check if sync is enabled
  SELECT value INTO sync_enabled
  FROM public.system_config
  WHERE key = 'enable_users_unified_sync';
  
  IF sync_enabled = 'true' THEN
    -- Sync logic here (only if enabled)
    INSERT INTO public.users_unified (
      id,
      email,
      password_hash,
      first_name,
      last_name,
      phone_number,
      is_active,
      created_at
    )
    VALUES (
      NEW.user_id,
      NEW.email,
      'synced_from_profile',
      COALESCE(SPLIT_PART(NEW.display_name, ' ', 1), 'Unknown'),
      COALESCE(SPLIT_PART(NEW.display_name, ' ', 2), 'User'),
      NEW.phone,
      NEW.ativo,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      phone_number = EXCLUDED.phone_number,
      is_active = EXCLUDED.is_active,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_profile_to_users_unified() IS 'Syncs profiles to users_unified';

-- Create trigger
DROP TRIGGER IF EXISTS on_profile_sync_to_users_unified ON public.profiles;
CREATE TRIGGER on_profile_sync_to_users_unified
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_users_unified();

-- ==========================================
-- Trigger Function: update_updated_at_column
-- ==========================================
-- Automatically updates updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Automatically updates updated_at column';

-- Create triggers for tables with updated_at
DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- Trigger Function: update_user_invitations_updated_at
-- ==========================================
-- Updates updated_at for user_invitations
CREATE OR REPLACE FUNCTION public.update_user_invitations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_user_invitations_updated_at() IS 'Updates updated_at for user_invitations';

DROP TRIGGER IF EXISTS user_invitations_updated_at ON public.user_invitations;
CREATE TRIGGER user_invitations_updated_at
  BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_invitations_updated_at();

-- ==========================================
-- Trigger Function: period_locks_bu
-- ==========================================
-- Normalizes period_month and updates updated_at for period_locks
CREATE OR REPLACE FUNCTION public.period_locks_bu()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Normalize period_month to first day of month
  NEW.period_month = DATE_TRUNC('month', NEW.period_month)::DATE;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.period_locks_bu() IS 'Normalizes period_month and updates updated_at';

DROP TRIGGER IF EXISTS period_locks_before_update ON public.period_locks;
CREATE TRIGGER period_locks_before_update
  BEFORE INSERT OR UPDATE ON public.period_locks
  FOR EACH ROW
  EXECUTE FUNCTION public.period_locks_bu();

-- Verification
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND t.tgname IN (
      'on_auth_user_created',
      'on_profile_sync_to_users_unified',
      'update_tenants_updated_at',
      'update_profiles_updated_at',
      'update_notifications_updated_at',
      'user_invitations_updated_at',
      'period_locks_before_update'
    );

  IF trigger_count >= 5 THEN
    RAISE NOTICE '✅ Layer 10 triggers created successfully (% triggers)', trigger_count;
  ELSE
    RAISE EXCEPTION '❌ Failed to create all Layer 10 triggers (only % created)', trigger_count;
  END IF;
END $$;

