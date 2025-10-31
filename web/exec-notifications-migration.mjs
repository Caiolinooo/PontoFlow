import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://arzvingdtnttiejcvucs.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDk0NjcyOSwiZXhwIjoyMDYwNTIyNzI5fQ.Rfo5jOH3iFxFBPyV7mNtG7Ja29AFskUQYYA4fgG2HAk'

async function executeNotificationMigration() {
  console.log('🚀 Executando migration para notification tables...')
  
  try {
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // SQL para criar as tabelas de notificações
    const migrationSQL = `
      -- Phase 17: Web Push Notifications
      -- Create push_subscriptions table
      CREATE TABLE IF NOT EXISTS public.push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        auth TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, endpoint)
      );

      -- Create notification_preferences table
      CREATE TABLE IF NOT EXISTS public.notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
        email_notifications BOOLEAN DEFAULT TRUE,
        push_notifications BOOLEAN DEFAULT FALSE,
        deadline_reminders BOOLEAN DEFAULT TRUE,
        approval_notifications BOOLEAN DEFAULT TRUE,
        rejection_notifications BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create notification_log table for audit trail
      CREATE TABLE IF NOT EXISTS public.notification_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        type TEXT NOT NULL, -- 'email', 'push', 'in-app'
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        data JSONB,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Phase 24: In-App Notifications System
      -- Create notifications table for storing in-app notifications
      CREATE TABLE IF NOT EXISTS public.notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          event VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          data JSONB DEFAULT '{}',
          read BOOLEAN DEFAULT FALSE,
          read_at TIMESTAMP WITH TIME ZONE,
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);
      CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
      CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON public.notification_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON public.notification_log(sent_at);
      
      -- Indexes for notifications table
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_event ON notifications(event);

      -- Enable RLS
      ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

      -- RLS Policies for push_subscriptions
      CREATE POLICY IF NOT EXISTS "Users can view their own push subscriptions"
        ON public.push_subscriptions
        FOR SELECT
        USING (auth.uid() = user_id);

      CREATE POLICY IF NOT EXISTS "Users can insert their own push subscriptions"
        ON public.push_subscriptions
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);

      CREATE POLICY IF NOT EXISTS "Users can delete their own push subscriptions"
        ON public.push_subscriptions
        FOR DELETE
        USING (auth.uid() = user_id);

      -- RLS Policies for notification_preferences
      CREATE POLICY IF NOT EXISTS "Users can view their own notification preferences"
        ON public.notification_preferences
        FOR SELECT
        USING (auth.uid() = user_id);

      CREATE POLICY IF NOT EXISTS "Users can update their own notification preferences"
        ON public.notification_preferences
        FOR UPDATE
        USING (auth.uid() = user_id);

      CREATE POLICY IF NOT EXISTS "Users can insert their own notification preferences"
        ON public.notification_preferences
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);

      -- RLS Policies for notification_log
      CREATE POLICY IF NOT EXISTS "Users can view their own notification log"
        ON public.notification_log
        FOR SELECT
        USING (auth.uid() = user_id);

      -- RLS Policies for notifications
      CREATE POLICY IF NOT EXISTS "Users can view their own notifications" ON notifications
          FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY IF NOT EXISTS "Users can update their own notifications" ON notifications
          FOR UPDATE USING (auth.uid() = user_id);

      CREATE POLICY IF NOT EXISTS "Users can delete their own notifications" ON notifications
          FOR DELETE USING (auth.uid() = user_id);

      -- Grant permissions
      GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
      GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
      GRANT SELECT ON public.notification_log TO authenticated;
    `
    
    console.log('📝 Executando SQL de migration das notificações...')
    
    // Tentar executar o SQL via Supabase RPC
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ query: migrationSQL })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ Migration de notificações executada com sucesso!')
      console.log('Resultado:', result)
      return true
    } else {
      console.log('❌ Falha na execução da migration:', response.status, response.statusText)
      const errorText = await response.text()
      console.log('📝 Detalhes do erro:', errorText)
      
      // Tentar método alternativo - executar SQL diretamente via JS client
      console.log('🔄 Tentando método alternativo...')
      
      try {
        // Vamos testar se as tabelas já existem
        const { data, error } = await serviceSupabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .in('table_name', ['push_subscriptions', 'notification_preferences', 'notification_log', 'notifications'])
        
        if (error) {
          console.log('❌ Erro ao verificar tabelas:', error)
        } else {
          console.log('📊 Tabelas encontradas:', data)
          if (data.length >= 4) {
            console.log('✅ Todas as tabelas de notificação já existem!')
            return true
          }
        }
      } catch (altError) {
        console.log('❌ Método alternativo também falhou:', altError)
      }
      
      return false
    }
    
  } catch (error) {
    console.error('❌ Erro durante a execução:', error.message)
    return false
  }
}

// Executar a migration
executeNotificationMigration().then(success => {
  if (success) {
    console.log('🎉 Migration de notificações concluída com sucesso!')
  } else {
    console.log('❌ Migration de notificações falhou.')
  }
  process.exit(success ? 0 : 1)
})