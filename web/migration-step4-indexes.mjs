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
  console.log('=== Step 4: Create Performance Indexes ===\n');
  
  // Step 4A: Create index for manager_group_assignments
  console.log('1. Creating performance index for manager_group_assignments...');
  const managerIndexSQL = `
    CREATE INDEX IF NOT EXISTS idx_manager_group_assignments_tenant_manager 
      ON public.manager_group_assignments(tenant_id, manager_id);
  `;
  
  const managerIndexResult = await executeSQL(managerIndexSQL);
  
  // Step 4B: Create index for employee_group_members
  console.log('\n2. Creating performance index for employee_group_members...');
  const employeeIndexSQL = `
    CREATE INDEX IF NOT EXISTS idx_employee_group_members_tenant_employee 
      ON public.employee_group_members(tenant_id, employee_id);
  `;
  
  const employeeIndexResult = await executeSQL(employeeIndexSQL);
  
  console.log('\n=== Step 4 Results ===');
  console.log(`manager_group_assignments index: ${managerIndexResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`employee_group_members index: ${employeeIndexResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (!managerIndexResult.success || !employeeIndexResult.success) {
    console.log('\n❌ Step 4 failed. Some indexes could not be created.');
    process.exit(1);
  }
  
  console.log('\n✅ Step 4 completed successfully! Performance indexes created.');
  console.log('Ready for Step 5: Final verification of schema and indexes.');
}

main().catch(console.error);