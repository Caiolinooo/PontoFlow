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
    console.log('✅ SQL executed successfully');
    return { success: true, data, error: null };
  } catch (err) {
    console.error('❌ Exception:', err);
    return { success: false, data: null, error: err };
  }
}

async function main() {
  console.log('=== Step 2A: Add tenant_id columns ===\n');
  
  // Step 2A: Add tenant_id column to manager_group_assignments
  console.log('1. Adding tenant_id column to manager_group_assignments...');
  const addManagerColumnSQL = `
    ALTER TABLE public.manager_group_assignments 
      ADD COLUMN IF NOT EXISTS tenant_id uuid;
  `;
  
  const managerResult = await executeSQL(addManagerColumnSQL);
  
  // Step 2A: Add tenant_id column to employee_group_members  
  console.log('\n2. Adding tenant_id column to employee_group_members...');
  const addEmployeeColumnSQL = `
    ALTER TABLE public.employee_group_members 
      ADD COLUMN IF NOT EXISTS tenant_id uuid;
  `;
  
  const employeeResult = await executeSQL(addEmployeeColumnSQL);
  
  console.log('\n=== Step 2A Results ===');
  console.log(`manager_group_assignments: ${managerResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`employee_group_members: ${employeeResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (!managerResult.success || !employeeResult.success) {
    console.log('\n❌ Step 2A failed. Cannot proceed to next step.');
    process.exit(1);
  }
  
  console.log('\n✅ Step 2A completed successfully! Ready for Step 2B verification.');
}

main().catch(console.error);