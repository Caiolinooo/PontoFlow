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

async function checkConstraints() {
  console.log('=== CHECKING TIMESHEETS CONSTRAINTS ===');
  
  try {
    // 1. Get the constraint definition
    console.log('\n1. Checking timesheets_status_check constraint...');
    const { data: constraints, error: constraintError } = await supabase
      .from('information_schema.check_constraints')
      .select('constraint_name, check_clause')
      .eq('constraint_name', 'timesheets_status_check');

    if (constraintError) {
      console.error('Error fetching constraints:', constraintError);
    } else {
      console.log('Check constraints found:', constraints?.length || 0);
      constraints?.forEach(constraint => {
        console.log('Constraint:', constraint.constraint_name, 'Clause:', constraint.check_clause);
      });
    }

    // 2. Get enum values if using ENUM type
    console.log('\n2. Checking ENUM types...');
    const { data: enumTypes, error: enumError } = await supabase
      .from('information_schema.udt')
      .select('udt_name, data_type')
      .eq('udt_name', 'timesheet_status');

    if (enumError) {
      console.error('Error fetching enum types:', enumError);
    } else {
      console.log('Enum types found:', enumTypes?.length || 0);
      if (enumTypes?.length > 0) {
        console.log('Found ENUM type:', enumTypes[0]);
      }
    }

    // 3. Check what status values exist in the current data
    console.log('\n3. Existing status values in timesheets:');
    const { data: statusValues, error: statusError } = await supabase
      .from('timesheets')
      .select('status')
      .not('status', 'is', null);

    if (statusError) {
      console.error('Error fetching status values:', statusError);
    } else {
      const uniqueStatuses = [...new Set(statusValues?.map(t => t.status) || [])];
      console.log('Existing status values:', uniqueStatuses);
    }

    // 4. Try to find the specific constraint definition through SQL
    console.log('\n4. Attempting direct constraint query...');
    
    // Note: This would require raw SQL access, but let's try through RPC if available
    try {
      const { data: rawResult, error: rpcError } = await supabase
        .rpc('get_constraint_definition', { 
          constraint_name: 'timesheets_status_check' 
        });

      if (rpcError) {
        console.log('RPC approach failed (expected):', rpcError.message);
      } else {
        console.log('Constraint definition:', rawResult);
      }
    } catch (e) {
      console.log('RPC approach not available');
    }

  } catch (error) {
    console.error('Check constraints error:', error);
  }
}

checkConstraints();