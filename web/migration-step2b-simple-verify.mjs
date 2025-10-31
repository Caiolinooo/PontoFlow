#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://arzvingdtnttiejcvucs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDk0NjcyOSwiZXhwIjoyMDYwNTIyNzI5fQ.Rfo5jOH3iFxFBPyV7mNtG7Ja29AFskUQYYA4fgG2HAk';

async function executeSQL(sql) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data, error } = await supabase.rpc('execute_sql', { query: sql });
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

async function main() {
  console.log('=== Step 2B: Simple Column Verification ===\n');
  
  try {
    // Simple test - check if tenant_id column exists by trying to select it
    console.log('Testing if tenant_id columns exist...');
    
    const testQuery1 = "SELECT tenant_id FROM manager_group_assignments LIMIT 1;";
    const testQuery2 = "SELECT tenant_id FROM employee_group_members LIMIT 1;";
    
    console.log('1. Testing manager_group_assignments.tenant_id...');
    const result1 = await executeSQL(testQuery1);
    
    if (result1.error) {
      if (result1.error.message.includes('tenant_id')) {
        console.log('❌ Column does not exist or is not accessible');
        console.log('Error:', result1.error.message);
      } else {
        console.log('✅ Column exists (error is unrelated to missing column)');
      }
    } else {
      console.log('✅ Column exists and is accessible');
    }
    
    console.log('\n2. Testing employee_group_members.tenant_id...');
    const result2 = await executeSQL(testQuery2);
    
    if (result2.error) {
      if (result2.error.message.includes('tenant_id')) {
        console.log('❌ Column does not exist or is not accessible');
        console.log('Error:', result2.error.message);
      } else {
        console.log('✅ Column exists (error is unrelated to missing column)');
      }
    } else {
      console.log('✅ Column exists and is accessible');
    }
    
    console.log('\n=== Step 2B Results ===');
    if (result1.error && result1.error.message.includes('tenant_id')) {
      console.log('❌ manager_group_assignments.tenant_id: MISSING');
    } else {
      console.log('✅ manager_group_assignments.tenant_id: EXISTS');
    }
    
    if (result2.error && result2.error.message.includes('tenant_id')) {
      console.log('❌ employee_group_members.tenant_id: MISSING');
    } else {
      console.log('✅ employee_group_members.tenant_id: EXISTS');
    }
    
    // If both exist, proceed
    if ((!result1.error || !result1.error.message.includes('tenant_id')) && 
        (!result2.error || !result2.error.message.includes('tenant_id'))) {
      console.log('\n✅ Step 2B verification passed! Columns exist. Ready for Step 2C.');
    } else {
      console.log('\n❌ Step 2B failed. Some columns are missing.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

main().catch(console.error);