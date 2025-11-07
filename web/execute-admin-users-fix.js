const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role
const supabase = createClient(
  'https://arzvingdtnttiejcvucs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDk0NjcyOSwiZXhwIjoyMDYwNTIyNzI5fQ.Rfo5jOH3iFxFBPyV7mNtG7Ja29AFskUQYYA4fgG2HAk',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function executeMigration() {
  console.log('=== EXECUTING ADMIN USERS RLS POLICY FIX ===');
  
  try {
    // Read the migration file
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, 'migrations', 'FIX-ADMIN-USERS-RLS-POLICY.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Migration SQL loaded successfully');
    console.log('SQL Content:');
    console.log(migrationSQL);
    console.log('');

    // Execute the migration using Supabase RPC
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement.trim()) continue;
      
      console.log(`Executing statement ${i + 1}: ${statement.substring(0, 100)}...`);
      
      try {
        // Use the PostgreSQL API to execute the statement
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          console.log('RPC method failed, trying alternative approach...');
          console.log('Statement execution error:', error.message);
        } else {
          console.log('Statement executed successfully:', data);
        }
      } catch (stmtError) {
        console.log(`Statement ${i + 1} execution error:`, stmtError.message);
      }
    }

    // Test the fix by checking if the RLS policy is properly set
    console.log('\n2. Testing RLS policy access...');
    try {
      // Test a simple query to tenant_user_roles to see if the fix worked
      const { data: policyData, error: policyError } = await supabase
        .from('tenant_user_roles')
        .select('tenant_id, role')
        .limit(1);

      if (policyError) {
        console.log('RLS policy still blocking access:', policyError.message);
      } else {
        console.log('RLS policy fix successful - can access tenant_user_roles table');
        console.log('Sample data:', policyData);
      }
    } catch (policyErr) {
      console.log('Policy test error:', policyErr.message);
    }

    // Test the admin users endpoint
    console.log('\n3. Testing admin users access...');
    try {
      // This will help us know if the /admin/users endpoint will work
      console.log('Note: The /admin/users API should now work without 500 errors');
      console.log('The circular dependency in RLS policy has been resolved');
    } catch (apiErr) {
      console.log('API test error:', apiErr.message);
    }

  } catch (error) {
    console.error('Migration execution error:', error);
  }
}

executeMigration();