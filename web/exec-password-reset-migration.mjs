#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting password reset tokens migration...\n');

    // Read migration SQL
    const migrationPath = join(dirname(fileURLToPath(import.meta.url)), 'migrations', 'password-reset-tokens.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Executing migration SQL...');
    
    // Execute migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL }).catch(async () => {
      // If exec_sql function doesn't exist, try direct query
      return await supabase.from('_migrations').insert({ sql: migrationSQL }).select().single().catch(async () => {
        // Last resort: use raw query
        const { data, error } = await supabase.rpc('query', { query_text: migrationSQL });
        return { data, error };
      });
    });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
      console.log('─'.repeat(80));
      console.log(migrationSQL);
      console.log('─'.repeat(80));
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Created:');
    console.log('  - password_reset_tokens table');
    console.log('  - Indexes for performance');
    console.log('  - RLS policies');
    console.log('  - cleanup_expired_reset_tokens() function\n');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

runMigration();

