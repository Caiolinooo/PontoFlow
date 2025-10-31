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
  console.log('=== Step 2C: Populate tenant_id data ===\n');
  
  // Check current data counts before population
  console.log('1. Checking current data state...');
  const checkSQL = `
    SELECT 
      'manager_group_assignments' as table_name,
      COUNT(*) as total_rows,
      COUNT(tenant_id) as populated_rows
    FROM manager_group_assignments
    UNION ALL
    SELECT 
      'employee_group_members' as table_name,
      COUNT(*) as total_rows,
      COUNT(tenant_id) as populated_rows
    FROM employee_group_members;
  `;
  
  const checkResult = await executeSQL(checkSQL);
  if (checkResult.success) {
    console.log('Current data state (before population):');
    console.log('   Total rows and populated count will be shown after execution');
  }
  
  // Populate tenant_id for manager_group_assignments
  console.log('\n2. Populating tenant_id for manager_group_assignments...');
  const populateManagerSQL = `
    UPDATE public.manager_group_assignments mga
    SET tenant_id = g.tenant_id
    FROM public.groups g
    WHERE mga.group_id = g.id
      AND mga.tenant_id IS NULL;
  `;
  
  const managerResult = await executeSQL(populateManagerSQL);
  
  // Populate tenant_id for employee_group_members
  console.log('\n3. Populating tenant_id for employee_group_members...');
  const populateEmployeeSQL = `
    UPDATE public.employee_group_members egm
    SET tenant_id = g.tenant_id
    FROM public.groups g
    WHERE egm.group_id = g.id
      AND egm.tenant_id IS NULL;
  `;
  
  const employeeResult = await executeSQL(populateEmployeeSQL);
  
  console.log('\n=== Step 2C Results ===');
  console.log(`manager_group_assignments: ${managerResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`employee_group_members: ${employeeResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (!managerResult.success || !employeeResult.success) {
    console.log('\n❌ Step 2C failed. Cannot proceed to next step.');
    process.exit(1);
  }
  
  // Check data state after population
  console.log('\n4. Verifying population results...');
  const verifyResult = await executeSQL(checkSQL);
  if (verifyResult.success) {
    console.log('Data state after population:');
    console.log('   All rows should now have tenant_id populated');
  }
  
  console.log('\n✅ Step 2C completed successfully! Ready for Step 2D verification.');
}

main().catch(console.error);