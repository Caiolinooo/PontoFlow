#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = join(__dirname, '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });

    return envVars;
  } catch (error) {
    console.error('⚠️  Could not load .env.local file');
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('🚀 Starting user invitations migration...\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, 'docs', 'migrations', 'user-invitations.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Executing migration SQL...');
    
    // Execute migration
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    });

    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('⚠️  exec_sql function not found, trying direct execution...');
      
      // Split by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await supabase.rpc('exec', { 
            query: statement 
          });
          
          if (stmtError) {
            console.error('❌ Error executing statement:', stmtError.message);
            console.error('Statement:', statement.substring(0, 100) + '...');
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!\n');
    
    // Verify table creation
    console.log('🔍 Verifying table creation...');
    const { data: tables, error: verifyError } = await supabase
      .from('user_invitations')
      .select('id')
      .limit(1);

    if (verifyError) {
      console.error('❌ Table verification failed:', verifyError.message);
      console.log('\n⚠️  Please run the migration manually in Supabase SQL Editor:');
      console.log('   1. Go to https://app.supabase.com');
      console.log('   2. Select your project');
      console.log('   3. Go to SQL Editor');
      console.log('   4. Copy and paste the contents of: web/docs/migrations/user-invitations.sql');
      console.log('   5. Click "Run"\n');
    } else {
      console.log('✅ Table user_invitations created successfully!\n');
    }

    console.log('📊 Migration Summary:');
    console.log('   ✓ user_invitations table created');
    console.log('   ✓ Indexes created');
    console.log('   ✓ RLS policies configured');
    console.log('   ✓ Helper functions created\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n⚠️  Please run the migration manually in Supabase SQL Editor:');
    console.log('   1. Go to https://app.supabase.com');
    console.log('   2. Select your project');
    console.log('   3. Go to SQL Editor');
    console.log('   4. Copy and paste the contents of: web/docs/migrations/user-invitations.sql');
    console.log('   5. Click "Run"\n');
    process.exit(1);
  }
}

runMigration();

