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

async function createTestTimesheets() {
  console.log('=== CREATING TEST TIMESHEETS ===');
  
  try {
    // 1. Get existing employees and their tenant_id
    console.log('\n1. Fetching employees...');
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, tenant_id')
      .limit(5);

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      return;
    }

    console.log('Found employees:', employees?.length || 0);
    if (!employees || employees.length === 0) {
      console.log('No employees found, cannot create test data');
      return;
    }

    // Use the first employee's tenant_id for creating test data
    const tenantId = employees[0].tenant_id || '1c89cfe8-b7c3-4c67-9a9f-d204f0d62280'; // Fallback to known tenant_id
    
    // 2. Create test timesheets with 'enviado' status
    console.log('\n2. Creating test timesheets with enviado status...');
    
    const testTimesheets = [
      {
        tenant_id: tenantId,
        employee_id: employees[0].id,
        periodo_ini: '2025-10-01',
        periodo_fim: '2025-10-31',
        status: 'enviado',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        tenant_id: tenantId,
        employee_id: employees[1]?.id || employees[0].id, // Use second employee or fallback
        periodo_ini: '2025-10-01',
        periodo_fim: '2025-10-31',
        status: 'enviado',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const { data: createdTimesheets, error: createError } = await supabase
      .from('timesheets')
      .insert(testTimesheets)
      .select('id, employee_id, status, periodo_ini, periodo_fim');

    if (createError) {
      console.error('Error creating test timesheets:', createError);
      return;
    }

    console.log('✅ Created test timesheets:', createdTimesheets?.length || 0);
    console.log('Created timesheets:', JSON.stringify(createdTimesheets, null, 2));

    // 3. Verify the pending timesheets API now returns data
    console.log('\n3. Testing pending timesheets API...');
    
    // We'll test this through the API endpoint since we have the session
    console.log('Test timesheets created successfully!');
    console.log('Now you can test the pending page again and it should show pending timesheets.');

    // 4. Show current timesheets status
    console.log('\n4. Current timesheets status:');
    const { data: allTimesheets, error: allError } = await supabase
      .from('timesheets')
      .select('id, employee_id, status, periodo_ini, periodo_fim')
      .order('created_at', { ascending: false });

    if (!allError && allTimesheets) {
      const statusCounts = allTimesheets.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});
      console.log('Timesheets by status:', statusCounts);
      console.log('Total timesheets:', allTimesheets.length);
    }

  } catch (error) {
    console.error('Create test timesheets error:', error);
  }
}

createTestTimesheets();