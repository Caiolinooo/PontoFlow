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

async function simpleDbCheck() {
  console.log('=== SIMPLE DATABASE SCHEMA CHECK ===');
  
  try {
    // 1. Check what tables exist in public schema
    console.log('\n1. Public Schema Tables:');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
    } else {
      console.log('Tables found:', tables?.map(t => t.table_name) || []);
    }

    // 2. Check auth users table
    console.log('\n2. Auth Users Table (first 5):');
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('id, email, created_at')
      .eq('email', 'caio.correia@groupabz.com')
      .limit(5);

    if (authError) {
      console.error('Error fetching auth users:', authError);
    } else {
      console.log('Auth user found:', authUsers?.[0] || null);
    }

    // 3. Check if tenant_user_roles table exists and its structure
    console.log('\n3. Tenant User Roles:');
    const { data: tenantRoles, error: tenantError } = await supabase
      .from('tenant_user_roles')
      .select('*')
      .limit(5);

    if (tenantError) {
      console.error('Error fetching tenant user roles:', tenantError);
    } else {
      console.log('Tenant roles count:', tenantRoles?.length || 0);
      if (tenantRoles?.length > 0) {
        console.log('Sample tenant role:', JSON.stringify(tenantRoles[0], null, 2));
      }
    }

    // 4. Check timesheets table
    console.log('\n4. Timesheets Table (sample):');
    const { data: timesheets, error: timesheetsError } = await supabase
      .from('timesheets')
      .select('*')
      .limit(5);

    if (timesheetsError) {
      console.error('Error fetching timesheets:', timesheetsError);
    } else {
      console.log('Timesheets count:', timesheets?.length || 0);
      if (timesheets?.length > 0) {
        console.log('Sample timesheet:', JSON.stringify(timesheets[0], null, 2));
      }
    }

    // 5. Check employees table
    console.log('\n5. Employees Table (sample):');
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .limit(5);

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
    } else {
      console.log('Employees count:', employees?.length || 0);
      if (employees?.length > 0) {
        console.log('Sample employee:', JSON.stringify(employees[0], null, 2));
      }
    }

    // 6. Check profiles table
    console.log('\n6. Profiles Table (sample):');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    } else {
      console.log('Profiles count:', profiles?.length || 0);
      if (profiles?.length > 0) {
        console.log('Sample profile:', JSON.stringify(profiles[0], null, 2));
      }
    }

  } catch (error) {
    console.error('Database check error:', error);
  }
}

simpleDbCheck();