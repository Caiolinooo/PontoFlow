const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function debugDatabaseState() {
  console.log('=== DATABASE STATE VERIFICATION ===');
  
  try {
    // 1. Check user and role information
    console.log('\n1. User and Role Information:');
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select(`
        id,
        email,
        created_at,
        tenant_user_roles(
          role,
          tenant_id
        )
      `)
      .eq('email', 'caio.correia@groupabz.com')
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
    } else {
      console.log('User data:', JSON.stringify(userData, null, 2));
    }

    // 2. Check manager group assignments
    console.log('\n2. Manager Group Assignments:');
    const { data: managerGroups, error: groupsError } = await supabase
      .from('manager_group_assignments')
      .select(`
        id,
        group_id,
        manager_id,
        tenant_id,
        groups(
          name,
          tenant_id
        )
      `)
      .eq('manager_id', userData?.id);

    if (groupsError) {
      console.error('Error fetching manager groups:', groupsError);
    } else {
      console.log('Manager groups:', JSON.stringify(managerGroups, null, 2));
    }

    // 3. Check existing timesheets
    console.log('\n3. Existing Timesheets:');
    const { data: timesheets, error: timesheetsError } = await supabase
      .from('timesheets')
      .select(`
        id,
        employee_id,
        periodo_ini,
        periodo_fim,
        status,
        created_at,
        tenant_id,
        employees(
          id,
          profile_id,
          cargo,
          centro_custo,
          profiles(
            user_id,
            display_name,
            email
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (timesheetsError) {
      console.error('Error fetching timesheets:', timesheetsError);
    } else {
      console.log('Timesheets count:', timesheets?.length || 0);
      console.log('Sample timesheets:', JSON.stringify(timesheets, null, 2));
    }

    // 4. Check employees in tenant
    console.log('\n4. Employees in Tenant:');
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select(`
        id,
        profile_id,
        cargo,
        centro_custo,
        profiles(
          user_id,
          display_name,
          email
        )
      `)
      .eq('tenant_id', userData?.tenant_user_roles?.[0]?.tenant_id)
      .limit(5);

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
    } else {
      console.log('Employees count:', employees?.length || 0);
      console.log('Sample employees:', JSON.stringify(employees, null, 2));
    }

    // 5. Check timesheets by status
    console.log('\n5. Timesheets by Status:');
    const { data: statusCounts, error: statusError } = await supabase
      .from('timesheets')
      .select('status')
      .eq('tenant_id', userData?.tenant_user_roles?.[0]?.tenant_id);

    if (statusError) {
      console.error('Error fetching status counts:', statusError);
    } else {
      const counts = statusCounts.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});
      console.log('Timesheets by status:', counts);
    }

  } catch (error) {
    console.error('Database state verification error:', error);
  }
}

debugDatabaseState();