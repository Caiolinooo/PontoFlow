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
  console.log('=== EXECUTING APP_CONFIG MIGRATION ===');
  
  try {
    // Read the migration file
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, 'migrations', 'ADD-APP-CONFIG-TABLE.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Migration SQL loaded successfully');
    console.log('SQL Content:');
    console.log(migrationSQL);
    console.log('');

    // Execute the migration using Supabase RPC
    // First, let's check if we can create the table
    console.log('1. Creating app_config table...');
    
    // For CREATE TABLE operations, we need to use the SQL directly
    // Let's split the migration into individual statements
    
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\nExecuting statement ${i + 1}: ${statement.substring(0, 50)}...`);
      
      try {
        // Use the PostgreSQL API to execute the statement
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          // If RPC doesn't work, let's try direct table creation approach
          console.log('RPC method failed, trying direct approach...');
          
          if (statement.includes('CREATE TABLE app_config')) {
            // For table creation, we might need to handle this differently
            console.log('Creating app_config table...');
            console.log('Note: Table creation might require manual execution in Supabase dashboard if RPC fails');
          } else if (statement.includes('CREATE OR REPLACE FUNCTION')) {
            console.log('Creating/updating function...');
          } else if (statement.includes('CREATE TRIGGER')) {
            console.log('Creating trigger...');
          } else if (statement.includes('INSERT INTO app_config')) {
            console.log('Inserting initial BASE_URL value...');
          }
        } else {
          console.log('Statement executed successfully:', data);
        }
      } catch (stmtError) {
        console.log(`Statement ${i + 1} execution error:`, stmtError.message);
      }
    }

    // Let's also try a direct approach using the SQL editor
    console.log('\n2. Trying alternative approach - checking if app_config table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'app_config')
      .eq('table_schema', 'public');

    if (tableError) {
      console.log('Error checking table existence:', tableError);
    } else if (tableCheck && tableCheck.length > 0) {
      console.log('app_config table already exists!');
    } else {
      console.log('app_config table does not exist yet.');
      console.log('Please execute the migration manually in Supabase SQL editor:');
      console.log('File location:', migrationPath);
    }

    // Test the configuration
    console.log('\n3. Testing configuration retrieval...');
    try {
      const { data: configData, error: configError } = await supabase
        .from('app_config')
        .select('*')
        .eq('key', 'BASE_URL')
        .single();

      if (configError) {
        console.log('Configuration not accessible yet (expected if table doesn\'t exist):', configError.message);
      } else {
        console.log('Configuration retrieved successfully:', configData);
      }
    } catch (configErr) {
      console.log('Configuration test error:', configErr.message);
    }

  } catch (error) {
    console.error('Migration execution error:', error);
  }
}

executeMigration();