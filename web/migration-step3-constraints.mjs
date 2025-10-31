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
  console.log('=== Step 3: Create Constraints ===\n');
  
  // Step 3A: Make tenant_id not null for manager_group_assignments
  console.log('1. Making tenant_id NOT NULL for manager_group_assignments...');
  const managerNotNullSQL = `
    ALTER TABLE public.manager_group_assignments 
      ALTER COLUMN tenant_id SET NOT NULL;
  `;
  
  const managerNotNullResult = await executeSQL(managerNotNullSQL);
  
  // Step 3B: Make tenant_id not null for employee_group_members
  console.log('\n2. Making tenant_id NOT NULL for employee_group_members...');
  const employeeNotNullSQL = `
    ALTER TABLE public.employee_group_members 
      ALTER COLUMN tenant_id SET NOT NULL;
  `;
  
  const employeeNotNullResult = await executeSQL(employeeNotNullSQL);
  
  // Step 3C: Add foreign key constraint for manager_group_assignments
  console.log('\n3. Adding foreign key constraint for manager_group_assignments...');
  const managerFKSQL = `
    ALTER TABLE public.manager_group_assignments
      ADD CONSTRAINT manager_group_assignments_tenant_id_fkey 
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  `;
  
  const managerFKResult = await executeSQL(managerFKSQL);
  
  // Step 3D: Add foreign key constraint for employee_group_members
  console.log('\n4. Adding foreign key constraint for employee_group_members...');
  const employeeFKSQL = `
    ALTER TABLE public.employee_group_members
      ADD CONSTRAINT employee_group_members_tenant_id_fkey 
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  `;
  
  const employeeFKResult = await executeSQL(employeeFKSQL);
  
  console.log('\n=== Step 3 Results ===');
  console.log(`manager_group_assignments NOT NULL: ${managerNotNullResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`employee_group_members NOT NULL: ${employeeNotNullResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`manager_group_assignments FK constraint: ${managerFKResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`employee_group_members FK constraint: ${employeeFKResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  const allSuccess = managerNotNullResult.success && employeeNotNullResult.success && 
                    managerFKResult.success && employeeFKResult.success;
  
  if (!allSuccess) {
    console.log('\n❌ Step 3 failed. Some constraints could not be created.');
    process.exit(1);
  }
  
  console.log('\n✅ Step 3 completed successfully! All constraints created.');
  console.log('Ready for Step 4: Create performance indexes.');
}

main().catch(console.error);