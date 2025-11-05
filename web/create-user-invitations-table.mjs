import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role
const supabase = createClient(
  'https://knicakgqydicrvyohcni.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaWNha2dxeWRpY3J2eW9oY25pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDU1NTU5NywiZXhwIjoyMDUwMTMxNTk3fQ.Iq_Aq-Iq0Iq0Iq0Iq0Iq0Iq0Iq0Iq0Iq0Iq0Iq0',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function createUserInvitationsTable() {
  console.log('🚀 Creating user_invitations table...\n');

  try {
    // Step 1: Create table
    console.log('📝 Step 1: Creating table structure...');
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
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
          invited_by UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
          invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
          accepted_at TIMESTAMPTZ,
          tenant_ids UUID[] DEFAULT '{}',
          group_ids UUID[] DEFAULT '{}',
          managed_group_ids UUID[] DEFAULT '{}',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `
    });

    if (tableError) {
      console.error('❌ Error creating table:', tableError.message);
      // Try direct query instead
      const { error: directError } = await supabase
        .from('user_invitations')
        .select('id')
        .limit(1);
      
      if (directError && directError.code === '42P01') {
        console.log('⚠️  Table does not exist. Creating via raw SQL...');
        // We'll need to use the SQL editor in Supabase dashboard
        console.log('\n📋 Please run this SQL in Supabase SQL Editor:');
        console.log('='.repeat(80));
        console.log(`
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
  invited_by UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  accepted_at TIMESTAMPTZ,
  tenant_ids UUID[] DEFAULT '{}',
  group_ids UUID[] DEFAULT '{}',
  managed_group_ids UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON public.user_invitations(invited_by);

-- Enable RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY user_invitations_admin_all ON public.user_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users_unified
      WHERE users_unified.id = auth.uid()
      AND users_unified.role = 'ADMIN'
    )
  );

-- Trigger function
CREATE OR REPLACE FUNCTION update_user_invitations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_invitations_updated_at
  BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_invitations_updated_at();
        `);
        console.log('='.repeat(80));
        return;
      }
    }

    console.log('✅ Table created successfully!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createUserInvitationsTable();

