import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://arzvingdtnttiejcvucs.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDk0NjcyOSwiZXhwIjoyMDYwNTIyNzI5fQ.Rfo5jOH3iFxFBPyV7mNtG7Ja29AFskUQYYA4fgG2HAk';

console.log('🚀 Running user_invitations table migration...\n');
console.log('📍 Supabase URL:', SUPABASE_URL);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  try {
    // First, check if table already exists
    console.log('🔍 Checking if user_invitations table exists...');
    const { error: checkError } = await supabase
      .from('user_invitations')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Table already exists!');
      return;
    }

    if (checkError.code !== '42P01') {
      console.error('❌ Unexpected error checking table:', checkError);
      return;
    }

    console.log('📝 Table does not exist. Creating...\n');

    // Read SQL file
    const sqlPath = join(__dirname, 'migrations', 'create-user-invitations.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);
      
      // Extract statement type for logging
      const statementType = statement.split(/\s+/)[0].toUpperCase();
      console.log(`   Type: ${statementType}`);

      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        console.error('   Statement:', statement.substring(0, 100) + '...');
        
        // Continue with other statements
        continue;
      }

      console.log(`✅ Statement ${i + 1} executed successfully\n`);
    }

    // Verify table was created
    console.log('🔍 Verifying table creation...');
    const { error: verifyError } = await supabase
      .from('user_invitations')
      .select('id')
      .limit(1);

    if (verifyError) {
      console.error('❌ Table verification failed:', verifyError.message);
      console.log('\n⚠️  Please run the SQL manually in Supabase SQL Editor:');
      console.log('   Dashboard → SQL Editor → New Query');
      console.log('   Then paste the contents of: web/migrations/create-user-invitations.sql');
    } else {
      console.log('✅ Table created and verified successfully!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n⚠️  Please run the SQL manually in Supabase SQL Editor:');
    console.log('   Dashboard → SQL Editor → New Query');
    console.log('   Then paste the contents of: web/migrations/create-user-invitations.sql');
  }
}

runMigration();

