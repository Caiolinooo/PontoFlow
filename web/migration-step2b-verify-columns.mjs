#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://arzvingdtnttiejcvucs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDk0NjcyOSwiZXhwIjoyMDYwNTIyNzI5fQ.Rfo5jOH3iFxFBPyV7mNtG7Ja29AFskUQYYA4fgG2HAk';

async function executeSQL(sql) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data, error } = await supabase.rpc('execute_sql', { query: sql });
    if (error) {
      console.error('❌ SQL Error:', error);
      return { success: false, data: null, error };
    }
    return { success: true, data, error: null };
  } catch (err) {
    console.error('❌ Exception:', err);
    return { success: false, data: null, error: err };
  }
}

async function main() {
  console.log('=== Step 2B: Verify column addition ===\n');
  
  // Verify new columns exist with correct properties
  console.log('Checking tenant_id column existence and properties...');
  const verifySQL = `
    SELECT 
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns 
    WHERE table_name IN ('manager_group_assignments', 'employee_group_members')
      AND column_name = 'tenant_id'
    ORDER BY table_name;
  `;
  
  const result = await executeSQL(verifySQL);
  
  if (!result.success) {
    console.log('❌ Column verification failed. Cannot proceed to next step.');
    process.exit(1);
  }
  
  console.log('=== Step 2B Verification Results ===');
  if (result.data && result.data.data && Array.isArray(result.data.data)) {
    const columns = result.data.data;
    
    if (columns.length === 0) {
      console.log('❌ No tenant_id columns found! Migration may have failed.');
      process.exit(1);
    }
    
    columns.forEach(col => {
      console.log(`\n📋 ${col.table_name}:`);
      console.log(`   Column: ${col.column_name}`);
      console.log(`   Type: ${col.data_type}`);
      console.log(`   Nullable: ${col.is_nullable}`);
      console.log(`   Default: ${col.column_default || 'None'}`);
    });
    
    // Validate expected properties
    const allCorrect = columns.every(col => 
      col.column_name === 'tenant_id' && 
      col.data_type === 'uuid' &&
      col.is_nullable === 'YES'
    );
    
    console.log('\n=== Step 2B Validation ===');
    if (allCorrect) {
      console.log('✅ All tenant_id columns have correct properties:');
      console.log('   - Column name: tenant_id');
      console.log('   - Data type: uuid');
      console.log('   - Nullable: YES (will be set to NOT NULL after data population)');
      console.log('\n✅ Step 2B completed successfully! Ready for Step 2C: Populate data.');
    } else {
      console.log('❌ Some columns have incorrect properties. Please review the output above.');
      process.exit(1);
    }
  } else {
    console.log('❌ Unexpected response format:', result.data);
    process.exit(1);
  }
}

main().catch(console.error);